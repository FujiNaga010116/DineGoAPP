import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

interface ErrorResponseBody {
  message?: string | string[];
  error?: string;
  errors?: unknown;
  [key: string]: unknown;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errors: unknown = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const body = res as ErrorResponseBody;
        if (Array.isArray(body.message)) {
          message = 'Validation failed';
          errors = body.message;
        } else if (typeof body.message === 'string') {
          message = body.message;
        } else if (body.error) {
          message = body.error;
        }
        if (body.errors) {
          errors = body.errors;
        }
      }
    } else if (exception instanceof Error) {
      this.logger.error(
        `[Unhandled Error] ${request.method} ${request.url}: ${exception.message}`,
        exception.stack,
      );
      // In production, do not leak internal exception details
      message =
        process.env.NODE_ENV === 'production'
          ? 'Internal server error'
          : exception.message;
    } else {
      this.logger.error(
        `[Unknown Exception] ${request.method} ${request.url}`,
        JSON.stringify(exception),
      );
    }

    // Do not log sensitive data; log high-level info
    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `[${status}] ${request.method} ${request.url} - ${message}`,
      );
    } else if (status >= HttpStatus.BAD_REQUEST) {
      this.logger.warn(
        `[${status}] ${request.method} ${request.url} - ${message}`,
      );
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.originalUrl || request.url,
      method: request.method,
      message,
      ...(errors !== undefined ? { errors } : {}),
    });
  }
}
