// ─── HTTP Exception Filter ────────────────────────────────────────────────────
import {
  ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const exRes = exception.getResponse();

    const message =
      typeof exRes === 'string'
        ? exRes
        : (exRes as any).message ?? 'Internal error';

    const extras =
      typeof exRes === 'object' && exRes !== null
        ? Object.fromEntries(
            Object.entries(exRes as Record<string, unknown>).filter(
              ([key]) => !['message', 'statusCode', 'error'].includes(key),
            ),
          )
        : {};

    const body = {
      statusCode: status,
      error: exception.name,
      message,
      timestamp: new Date().toISOString(),
      path: req.url,
      ...extras,
    };

    if (status >= 500) this.logger.error(`${req.method} ${req.url}`, JSON.stringify(body));

    res.status(status).json(body);
  }
}
