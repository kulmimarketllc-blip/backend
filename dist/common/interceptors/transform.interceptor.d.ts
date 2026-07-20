import { NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
export interface ApiResponse<T> {
    success: boolean;
    data: T;
    timestamp: string;
}
export declare class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
    intercept(_ctx: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>>;
}
export declare class LoggingInterceptor implements NestInterceptor {
    private readonly logger;
    intercept(ctx: ExecutionContext, next: CallHandler): Observable<any>;
}
