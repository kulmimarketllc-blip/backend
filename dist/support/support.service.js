"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupportService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const ulid_1 = require("ulid");
const support_ticket_entity_1 = require("../database/entities/support-ticket.entity");
const user_entity_1 = require("../database/entities/user.entity");
const notifications_service_1 = require("../notifications/notifications.service");
const notification_entity_1 = require("../database/entities/notification.entity");
let SupportService = class SupportService {
    constructor(ticketsRepo, repliesRepo, usersRepo, notifications) {
        this.ticketsRepo = ticketsRepo;
        this.repliesRepo = repliesRepo;
        this.usersRepo = usersRepo;
        this.notifications = notifications;
    }
    async listTickets(query, requester) {
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
        if (query.status)
            qb.andWhere('t.status = :status', { status: query.status });
        if (query.priority)
            qb.andWhere('t.priority = :priority', { priority: query.priority });
        if (query.category)
            qb.andWhere('t.category = :category', { category: query.category });
        if (query.assignedToId)
            qb.andWhere('t.assignedToId = :assignedToId', { assignedToId: query.assignedToId });
        if (query.search) {
            qb.andWhere('(t.ticketNo ILIKE :search OR t.subject ILIKE :search OR t.description ILIKE :search)', { search: `%${query.search}%` });
        }
        if (requester.role === user_entity_1.UserRole.CUSTOMER) {
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
    async createTicket(dto, customer) {
        const ticketNo = await this.generateTicketNo();
        const ticket = this.ticketsRepo.create({
            id: (0, ulid_1.ulid)(),
            ticketNo,
            customerId: customer.id,
            subject: dto.subject,
            description: dto.description,
            category: dto.category,
            priority: dto.priority || support_ticket_entity_1.SupportTicketPriority.MEDIUM,
            status: support_ticket_entity_1.SupportTicketStatus.OPEN,
            orderId: dto.orderId,
        });
        const saved = await this.ticketsRepo.save(ticket);
        await this.notifications.notifySubAdmins('🆕 New Support Ticket', `Ticket #${ticketNo}: ${dto.subject}`, notification_entity_1.NotificationType.SUPPORT, `/subadmin/support-tickets`).catch(err => console.error('Failed to notify sub-admins of new ticket:', err.message));
        return saved;
    }
    async generateTicketNo() {
        const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const random = Math.floor(1000 + Math.random() * 9000);
        return `TKT-${date}-${random}`;
    }
    async getTicketCounts(requester) {
        const qb = this.ticketsRepo
            .createQueryBuilder('t')
            .select('t.status', 'status')
            .addSelect('COUNT(*)::int', 'count')
            .where('t.deleted_at IS NULL');
        if (requester.role === user_entity_1.UserRole.CUSTOMER) {
            qb.andWhere('t.customerId = :customerId', { customerId: requester.id });
        }
        qb.groupBy('t.status');
        const rows = await qb.getRawMany();
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
            if (row.status === support_ticket_entity_1.SupportTicketStatus.OPEN)
                counts.open = value;
            if (row.status === support_ticket_entity_1.SupportTicketStatus.IN_PROGRESS)
                counts.inProgress = value;
            if (row.status === support_ticket_entity_1.SupportTicketStatus.RESOLVED)
                counts.resolved = value;
            if (row.status === support_ticket_entity_1.SupportTicketStatus.CLOSED)
                counts.closed = value;
        });
        return counts;
    }
    async getTicketById(id, requester) {
        const ticket = await this.ticketsRepo.findOne({
            where: { id },
            relations: ['customer', 'assignedTo'],
        });
        if (!ticket)
            throw new common_1.NotFoundException('Support ticket not found');
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
        const visibleReplies = requester.role === user_entity_1.UserRole.CUSTOMER
            ? replies.filter((reply) => !reply.isInternal)
            : replies;
        return { ...ticket, replies: visibleReplies };
    }
    async updateTicketStatus(id, dto, requester) {
        this.enforceModerationAccess(requester);
        const ticket = await this.ticketsRepo.findOne({ where: { id } });
        if (!ticket)
            throw new common_1.NotFoundException('Support ticket not found');
        const patch = {
            status: dto.status,
            lastReplyAt: new Date(),
            lastReplyById: requester.id,
        };
        if (dto.status === support_ticket_entity_1.SupportTicketStatus.RESOLVED) {
            patch.resolvedAt = new Date();
            patch.closedAt = null;
        }
        if (dto.status === support_ticket_entity_1.SupportTicketStatus.CLOSED) {
            patch.closedAt = new Date();
            if (!ticket.resolvedAt)
                patch.resolvedAt = new Date();
        }
        if (dto.status === support_ticket_entity_1.SupportTicketStatus.OPEN || dto.status === support_ticket_entity_1.SupportTicketStatus.IN_PROGRESS) {
            patch.resolvedAt = null;
            patch.closedAt = null;
        }
        await this.ticketsRepo.update(id, patch);
        if (dto.note) {
            await this.repliesRepo.save(this.repliesRepo.create({
                id: (0, ulid_1.ulid)(),
                ticketId: id,
                authorId: requester.id,
                message: dto.note,
                isInternal: true,
            }));
        }
        return this.getTicketById(id, requester);
    }
    async addTicketReply(id, dto, requester) {
        const ticket = await this.ticketsRepo.findOne({ where: { id } });
        if (!ticket)
            throw new common_1.NotFoundException('Support ticket not found');
        this.enforceReplyAccess(ticket, requester);
        const isInternal = this.canPostInternal(requester) && Boolean(dto.isInternal);
        const reply = await this.repliesRepo.save(this.repliesRepo.create({
            id: (0, ulid_1.ulid)(),
            ticketId: id,
            authorId: requester.id,
            message: dto.message,
            isInternal,
        }));
        const nextStatus = ticket.status === support_ticket_entity_1.SupportTicketStatus.OPEN
            ? support_ticket_entity_1.SupportTicketStatus.IN_PROGRESS
            : ticket.status;
        await this.ticketsRepo.update(id, {
            status: nextStatus,
            lastReplyAt: new Date(),
            lastReplyById: requester.id,
        });
        return reply;
    }
    async assignTicket(id, assignedToId, requester) {
        this.enforceModerationAccess(requester);
        const ticket = await this.ticketsRepo.findOne({ where: { id } });
        if (!ticket)
            throw new common_1.NotFoundException('Support ticket not found');
        if (!assignedToId) {
            await this.ticketsRepo.update(id, {
                assignedToId: null,
                status: support_ticket_entity_1.SupportTicketStatus.OPEN,
            });
            return this.getTicketById(id, requester);
        }
        const assignee = await this.usersRepo.findOne({ where: { id: assignedToId } });
        if (!assignee)
            throw new common_1.NotFoundException('Assignee user not found');
        const assignableRoles = [user_entity_1.UserRole.SUB_ADMIN, user_entity_1.UserRole.ADMIN];
        if (!assignableRoles.includes(assignee.role)) {
            throw new common_1.ForbiddenException('Ticket can only be assigned to sub-admin/admin users');
        }
        await this.ticketsRepo.update(id, {
            assignedToId,
            status: ticket.status === support_ticket_entity_1.SupportTicketStatus.OPEN ? support_ticket_entity_1.SupportTicketStatus.IN_PROGRESS : ticket.status,
        });
        return this.getTicketById(id, requester);
    }
    enforceModerationAccess(user) {
        const allowed = [user_entity_1.UserRole.SUB_ADMIN, user_entity_1.UserRole.ADMIN];
        if (!allowed.includes(user.role)) {
            throw new common_1.ForbiddenException('Only sub-admin/admin can manage support tickets');
        }
    }
    enforceReadAccess(ticket, user) {
        if (user.role === user_entity_1.UserRole.CUSTOMER && ticket.customerId !== user.id) {
            throw new common_1.ForbiddenException('You can only access your own support tickets');
        }
    }
    enforceReplyAccess(ticket, user) {
        const staffRoles = [user_entity_1.UserRole.SUB_ADMIN, user_entity_1.UserRole.ADMIN];
        if (staffRoles.includes(user.role))
            return;
        if (user.role === user_entity_1.UserRole.CUSTOMER && ticket.customerId === user.id)
            return;
        throw new common_1.ForbiddenException('You do not have access to reply on this ticket');
    }
    canPostInternal(user) {
        return [user_entity_1.UserRole.SUB_ADMIN, user_entity_1.UserRole.ADMIN].includes(user.role);
    }
};
exports.SupportService = SupportService;
exports.SupportService = SupportService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(support_ticket_entity_1.SupportTicket)),
    __param(1, (0, typeorm_1.InjectRepository)(support_ticket_entity_1.SupportTicketReply)),
    __param(2, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        notifications_service_1.NotificationsService])
], SupportService);
//# sourceMappingURL=support.service.js.map