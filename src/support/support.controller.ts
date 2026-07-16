import {
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { SupportService } from './support.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { User, UserRole } from '../database/entities/user.entity';
import { ListSupportTicketsDto } from './dto/list-support-tickets.dto';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';
import { CreateTicketReplyDto } from './dto/create-ticket-reply.dto';
import { CreateSupportTicketDto } from './dto/create-ticket.dto';
import { AssignTicketDto } from './dto/assign-ticket.dto';

@ApiTags('support-tickets')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('support/tickets')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}
  
  @Post()
  @ApiOperation({ summary: 'Create a new support ticket' })
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() dto: CreateSupportTicketDto,
    @CurrentUser() user: User,
  ) {
    return this.supportService.createTicket(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'List support tickets' })
  list(
    @Query() query: ListSupportTicketsDto,
    @CurrentUser() user: User,
  ) {
    return this.supportService.listTickets(query, user);
  }

  @Get('counts')
  @ApiOperation({ summary: 'Get support ticket counts by status' })
  getCounts(@CurrentUser() user: User) {
    return this.supportService.getTicketCounts(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get support ticket details with replies' })
  getById(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    return this.supportService.getTicketById(id, user);
  }

  @Patch(':id/status')
  @Roles(UserRole.SUB_ADMIN, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update support ticket status' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateTicketStatusDto,
    @CurrentUser() user: User,
  ) {
    return this.supportService.updateTicketStatus(id, dto, user);
  }

  @Post(':id/replies')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add reply to support ticket' })
  addReply(
    @Param('id') id: string,
    @Body() dto: CreateTicketReplyDto,
    @CurrentUser() user: User,
  ) {
    return this.supportService.addTicketReply(id, dto, user);
  }

  @Patch(':id/assign')
  @Roles(UserRole.SUB_ADMIN, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Assign support ticket to a sub-admin/admin user' })
  assign(
    @Param('id') id: string,
    @Body() dto: AssignTicketDto,
    @CurrentUser() user: User,
  ) {
    return this.supportService.assignTicket(id, dto.assignedToId, user);
  }
}
