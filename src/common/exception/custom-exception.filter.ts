import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ResponseHelper } from '../helper/response.helper';

@Catch()
export class CustomExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(CustomExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse = isHttpException
      ? exception.getResponse()
      : 'Internal server error';

    const message =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : (exceptionResponse as any)?.message || 'Internal server error';

    const details =
      typeof exceptionResponse === 'object' && exceptionResponse !== null
        ? exceptionResponse
        : undefined;

    const logPayload = {
      status,
      method: request.method,
      path: request.url,
      ip: request.ip,
      message,
      stack: exception instanceof Error ? exception.stack : undefined,
    };

    if (status >= 500) {
      this.logger.error(
        `[${request.method}] ${request.url} -> ${status} ${message}`,
        logPayload.stack,
      );
    } else {
      this.logger.warn(
        `[${request.method}] ${request.url} -> ${status} ${message}`,
      );
    }

    response.status(status).json(
      ResponseHelper.error({
        message,
        // data: details,
        meta_data: {
          timestamp: new Date().toISOString(),
          path: request.url,
        },
      }),
    );
  }
}
