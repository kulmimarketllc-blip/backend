import {
  WebSocketGateway, WebSocketServer, SubscribeMessage,
  MessageBody, ConnectedSocket, OnGatewayConnection,
  OnGatewayDisconnect, WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Logger, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus } from '../database/entities/order.entity';
import { User, UserRole } from '../database/entities/user.entity';
import * as bcrypt from 'bcrypt';

interface DriverLocation {
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
}

@WebSocketGateway({
  cors: { origin: process.env.CLIENT_URL ?? 'http://localhost:4000', credentials: true },
  namespace: '/delivery',
})
export class DeliveryGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(DeliveryGateway.name);

  // Map<driverId, socketId>
  private driverSockets = new Map<string, string>();
  // Map<customerId, socketId>
  private customerSockets = new Map<string, string>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,

    @InjectRepository(Order)
    private readonly ordersRepo: Repository<Order>,
  ) {}

  // ── Connection / Auth ─────────────────────────
  async handleConnection(socket: Socket) {
    try {
      const token = socket.handshake.auth?.token
        ?? socket.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) { socket.disconnect(); return; }

      const payload = this.jwtService.verify<{ sub: string; role: string }>(token, {
        secret: this.config.get('JWT_SECRET'),
      });

      socket.data.userId = payload.sub;
      socket.data.role   = payload.role;

      if (payload.role === UserRole.DELIVERY_PARTNER) {
        this.driverSockets.set(payload.sub, socket.id);
        socket.join(`driver:${payload.sub}`);
        this.logger.log(`Driver connected: ${payload.sub}`);
      } else if (payload.role === UserRole.CUSTOMER) {
        this.customerSockets.set(payload.sub, socket.id);
        socket.join(`customer:${payload.sub}`);
        this.logger.log(`Customer connected: ${payload.sub}`);
      }
    } catch {
      socket.disconnect();
    }
  }

  handleDisconnect(socket: Socket) {
    const { userId, role } = socket.data;
    if (role === UserRole.DELIVERY_PARTNER) this.driverSockets.delete(userId);
    if (role === UserRole.CUSTOMER)         this.customerSockets.delete(userId);
    this.logger.log(`Disconnected: ${userId}`);
  }

  // ── Driver: Send GPS Location ─────────────────
  @SubscribeMessage('driver:location')
  async handleDriverLocation(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { orderId: string } & DriverLocation,
  ) {
    if (socket.data.role !== UserRole.DELIVERY_PARTNER) {
      throw new WsException('Forbidden');
    }

    const { orderId, ...location } = data;

    // Broadcast to customer tracking this order
    const order = await this.ordersRepo.findOne({ where: { id: orderId } });
    if (order?.customerId) {
      this.server.to(`customer:${order.customerId}`).emit('driver:location', {
        orderId, ...location, updatedAt: new Date().toISOString(),
      });
    }

    // Broadcast to admin room
    this.server.to('admin').emit('driver:location', {
      driverId: socket.data.userId, orderId, ...location,
    });
  }

  // ── Driver: OTP Confirmation ──────────────────
  @SubscribeMessage('delivery:confirm-otp')
  async handleConfirmOtp(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { orderId: string; otp: string },
  ) {
    const order = await this.ordersRepo.findOne({ where: { id: data.orderId } });
    if (!order) throw new WsException('Order not found');
    if (order.driverId !== socket.data.userId) throw new WsException('Forbidden');
    if (!order.deliveryOtp) throw new WsException('Delivery OTP not set for this order');

    const valid = await bcrypt.compare(data.otp, order.deliveryOtp);
    if (!valid) {
      socket.emit('delivery:otp-invalid', { message: 'Incorrect OTP' });
      return;
    }

    // Mark delivered
    await this.ordersRepo.update(data.orderId, {
      status: OrderStatus.DELIVERED,
      deliveredAt: new Date(),
    });

    // Notify customer
    this.server.to(`customer:${order.customerId}`).emit('order:delivered', {
      orderId: data.orderId, deliveredAt: new Date().toISOString(),
    });

    socket.emit('delivery:confirmed', { orderId: data.orderId });
    this.logger.log(`Order ${data.orderId} confirmed delivered by driver ${socket.data.userId}`);
  }

  // ── Broadcast from server (called by OrdersService) ──
  notifyCustomer(customerId: string, event: string, payload: any) {
    this.server.to(`customer:${customerId}`).emit(event, payload);
  }

  notifyDriver(driverId: string, event: string, payload: any) {
    this.server.to(`driver:${driverId}`).emit(event, payload);
  }

  notifyAdmin(event: string, payload: any) {
    this.server.to('admin').emit(event, payload);
  }
}
