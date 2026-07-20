import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { Order } from '../database/entities/order.entity';
interface DriverLocation {
    lat: number;
    lng: number;
    heading?: number;
    speed?: number;
}
export declare class DeliveryGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly jwtService;
    private readonly config;
    private readonly ordersRepo;
    server: Server;
    private readonly logger;
    private driverSockets;
    private customerSockets;
    constructor(jwtService: JwtService, config: ConfigService, ordersRepo: Repository<Order>);
    handleConnection(socket: Socket): Promise<void>;
    handleDisconnect(socket: Socket): void;
    handleDriverLocation(socket: Socket, data: {
        orderId: string;
    } & DriverLocation): Promise<void>;
    handleConfirmOtp(socket: Socket, data: {
        orderId: string;
        otp: string;
    }): Promise<void>;
    notifyCustomer(customerId: string, event: string, payload: any): void;
    notifyDriver(driverId: string, event: string, payload: any): void;
    notifyAdmin(event: string, payload: any): void;
}
export {};
