import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ulid } from 'ulid';

import {
  SupportTicket,
  SupportTicketReply,
  SupportTicketStatus,
  SupportTicketPriority,
  SupportTicketCategory,
} from '../database/entities/support-ticket.entity';
import { User, UserRole } from '../database/entities/user.entity';
import { ListSupportTicketsDto } from './dto/list-support-tickets.dto';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';
import { CreateTicketReplyDto } from './dto/create-ticket-reply.dto';
import { CreateSupportTicketDto } from './dto/create-ticket.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../database/entities/notification.entity';

@Injectable()
export class SupportService {
  constructor(
    @InjectRepository(SupportTicket)
    private readonly ticketsRepo: Repository<SupportTicket>,

    @InjectRepository(SupportTicketReply)
    private readonly repliesRepo: Repository<SupportTicketReply>,

    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,

    private readonly notifications: NotificationsService,
  ) {}

  async listTickets(query: ListSupportTicketsDto, requester: User) {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 20);

    const qb = this.ticketsRepo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.customer', 'customer')
      .leftJoinAndSelect('t.assignedTo', 'assignedTo')
      .select([
        't',
        'customer.id',
        'customer.firstName',
        'customer.lastName',
        'customer.email',
        'assignedTo.id',
        'assignedTo.firstName',
        'assignedTo.lastName',
        'assignedTo.email',
      ])
      .where('t.deleted_at IS NULL');

    if (query.status) qb.andWhere('t.status = :status', { status: query.status });
    if (query.priority) qb.andWhere('t.priority = :priority', { priority: query.priority });
    if (query.category) qb.andWhere('t.category = :category', { category: query.category });
    if (query.assignedToId) qb.andWhere('t.assignedToId = :assignedToId', { assignedToId: query.assignedToId });

    if (query.search) {
      qb.andWhere(
        '(t.ticketNo ILIKE :search OR t.subject ILIKE :search OR t.description ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    if (requester.role === UserRole.CUSTOMER) {
      qb.andWhere('t.customerId = :customerId', { customerId: requester.id });
    }

    qb.orderBy('t.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }
  
  async createTicket(dto: CreateSupportTicketDto, customer: User) {
    const ticketNo = await this.generateTicketNo();
    
    const ticket = this.ticketsRepo.create({
      id: ulid(),
      ticketNo,
      customerId: customer.id,
      subject: dto.subject,
      description: dto.description,
      category: dto.category,
      priority: dto.priority || SupportTicketPriority.MEDIUM,
      status: SupportTicketStatus.OPEN,
      orderId: dto.orderId,
    });
    
    const saved = await this.ticketsRepo.save(ticket);
    
    // Notify Sub-Admins
    await this.notifications.notifySubAdmins(
      '🆕 New Support Ticket',
      `Ticket #${ticketNo}: ${dto.subject}`,
      NotificationType.SUPPORT,
      `/subadmin/support-tickets`
    ).catch(err => console.error('Failed to notify sub-admins of new ticket:', err.message));
    
    return saved;
  }

  private async generateTicketNo(): Promise<string> {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(1000 + Math.random() * 9000);
    return `TKT-${date}-${random}`;
  }

  async getTicketCounts(requester: User) {
    const qb = this.ticketsRepo
      .createQueryBuilder('t')
      .select('t.status', 'status')
      .addSelect('COUNT(*)::int', 'count')
      .where('t.deleted_at IS NULL');

    if (requester.role === UserRole.CUSTOMER) {
      qb.andWhere('t.customerId = :customerId', { customerId: requester.id });
    }

    qb.groupBy('t.status');

    const rows = await qb.getRawMany<{ status: SupportTicketStatus; count: number }>();

    const counts = {
      total: 0,
      open: 0,
      inProgress: 0,
      resolved: 0,
      closed: 0,
    };

    rows.forEach((row) => {
      const value = Number(row.count || 0);
      counts.total += value;
      if (row.status === SupportTicketStatus.OPEN) counts.open = value;
      if (row.status === SupportTicketStatus.IN_PROGRESS) counts.inProgress = value;
      if (row.status === SupportTicketStatus.RESOLVED) counts.resolved = value;
      if (row.status === SupportTicketStatus.CLOSED) counts.closed = value;
    });

    return counts;
  }

  async getTicketById(id: string, requester: User) {
    const ticket = await this.ticketsRepo.findOne({
      where: { id },
      relations: ['customer', 'assignedTo'],
    });
    if (!ticket) throw new NotFoundException('Support ticket not found');

    this.enforceReadAccess(ticket, requester);

    const replies = await this.repliesRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.author', 'author')
      .select([
        'r',
        'author.id',
        'author.firstName',
        'author.lastName',
        'author.email',
        'author.role',
      ])
      .where('r.ticketId = :ticketId', { ticketId: id })
      .orderBy('r.createdAt', 'ASC')
      .getMany();

    const visibleReplies = requester.role === UserRole.CUSTOMER
      ? replies.filter((reply) => !reply.isInternal)
      : replies;

    return { ...ticket, replies: visibleReplies };
  }

  async updateTicketStatus(id: string, dto: UpdateTicketStatusDto, requester: User) {
    this.enforceModerationAccess(requester);

    const ticket = await this.ticketsRepo.findOne({ where: { id } });
    if (!ticket) throw new NotFoundException('Support ticket not found');

    const patch: Partial<SupportTicket> = {
      status: dto.status,
      lastReplyAt: new Date(),
      lastReplyById: requester.id,
    };

    if (dto.status === SupportTicketStatus.RESOLVED) {
      patch.resolvedAt = new Date();
      patch.closedAt = null as any;
    }

    if (dto.status === SupportTicketStatus.CLOSED) {
      patch.closedAt = new Date();
      if (!ticket.resolvedAt) patch.resolvedAt = new Date();
    }

    if (dto.status === SupportTicketStatus.OPEN || dto.status === SupportTicketStatus.IN_PROGRESS) {
      patch.resolvedAt = null as any;
      patch.closedAt = null as any;
    }

    await this.ticketsRepo.update(id, patch);

    if (dto.note) {
      await this.repliesRepo.save(this.repliesRepo.create({
        id: ulid(),
        ticketId: id,
        authorId: requester.id,
        message: dto.note,
        isInternal: true,
      }));
    }

    return this.getTicketById(id, requester);
  }

  async addTicketReply(id: string, dto: CreateTicketReplyDto, requester: User) {
    const ticket = await this.ticketsRepo.findOne({ where: { id } });
    if (!ticket) throw new NotFoundException('Support ticket not found');

    this.enforceReplyAccess(ticket, requester);

    const isInternal = this.canPostInternal(requester) && Boolean(dto.isInternal);

    const reply = await this.repliesRepo.save(this.repliesRepo.create({
      id: ulid(),
      ticketId: id,
      authorId: requester.id,
      message: dto.message,
      isInternal,
    }));

    const nextStatus = ticket.status === SupportTicketStatus.OPEN
      ? SupportTicketStatus.IN_PROGRESS
      : ticket.status;

    await this.ticketsRepo.update(id, {
      status: nextStatus,
      lastReplyAt: new Date(),
      lastReplyById: requester.id,
    });

    return reply;
  }

  async assignTicket(id: string, assignedToId: string | undefined, requester: User) {
    this.enforceModerationAccess(requester);

    const ticket = await this.ticketsRepo.findOne({ where: { id } });
    if (!ticket) throw new NotFoundException('Support ticket not found');

    if (!assignedToId) {
      await this.ticketsRepo.update(id, {
        assignedToId: null as any,
        status: SupportTicketStatus.OPEN,
      });
      return this.getTicketById(id, requester);
    }

    const assignee = await this.usersRepo.findOne({ where: { id: assignedToId } });
    if (!assignee) throw new NotFoundException('Assignee user not found');

    const assignableRoles = [UserRole.SUB_ADMIN, UserRole.ADMIN];
    if (!assignableRoles.includes(assignee.role)) {
      throw new ForbiddenException('Ticket can only be assigned to sub-admin/admin users');
    }

    await this.ticketsRepo.update(id, {
      assignedToId,
      status: ticket.status === SupportTicketStatus.OPEN ? SupportTicketStatus.IN_PROGRESS : ticket.status,
    });

    return this.getTicketById(id, requester);
  }

  private enforceModerationAccess(user: User) {
    const allowed = [UserRole.SUB_ADMIN, UserRole.ADMIN];
    if (!allowed.includes(user.role)) {
      throw new ForbiddenException('Only sub-admin/admin can manage support tickets');
    }
  }

  private enforceReadAccess(ticket: SupportTicket, user: User) {
    if (user.role === UserRole.CUSTOMER && ticket.customerId !== user.id) {
      throw new ForbiddenException('You can only access your own support tickets');
    }
  }

  private enforceReplyAccess(ticket: SupportTicket, user: User) {
    const staffRoles = [UserRole.SUB_ADMIN, UserRole.ADMIN];
    if (staffRoles.includes(user.role)) return;

    if (user.role === UserRole.CUSTOMER && ticket.customerId === user.id) return;

    throw new ForbiddenException('You do not have access to reply on this ticket');
  }

  private canPostInternal(user: User) {
    return [UserRole.SUB_ADMIN, UserRole.ADMIN].includes(user.role);
  }
}
