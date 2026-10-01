import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { LoggerService } from '../logger/logger.service';
import { AuthException } from '../exceptions/auth.exceptions';

/**
 * Enhanced HTTP Exception Filter
 * Provides consistent error response format across all endpoints
 * Handles custom AuthException with error codes
 * Prevents information leakage in production
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: LoggerService) {
    this.logger.setContext('HttpExceptionFilter');
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Determine status code
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // Build error response based on exception type
    let errorResponse: any;

    if (exception instanceof AuthException) {
      // Custom auth exception with structured error format
      const exceptionResponse = exception.getResponse() as any;
      errorResponse = {
        success: false,
        error: {
          code: exceptionResponse.error.code,
          message: exceptionResponse.error.message,
          details: exceptionResponse.error.details,
        },
        statusCode: status,
        timestamp: new Date().toISOString(),
        path: request.url,
      };
    } else if (exception instanceof HttpException) {
      // Standard HTTP exception
      const exceptionResponse = exception.getResponse();
      const message =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : (exceptionResponse as any).message || exception.message;

      errorResponse = {
        success: false,
        error: {
          code: this.getErrorCodeFromStatus(status),
          message: Array.isArray(message) ? message.join(', ') : message,
          details:
            typeof exceptionResponse === 'object'
              ? exceptionResponse
              : undefined,
        },
        statusCode: status,
        timestamp: new Date().toISOString(),
        path: request.url,
      };
    } else {
      // Unknown exception - don't leak details in production
      const message =
        process.env.NODE_ENV === 'production'
          ? 'Internal server error'
          : exception instanceof Error
            ? exception.message
            : 'Unknown error occurred';

      errorResponse = {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message,
          details:
            process.env.NODE_ENV === 'production'
              ? undefined
              : {
                  type: exception?.constructor?.name,
                },
        },
        statusCode: status,
        timestamp: new Date().toISOString(),
        path: request.url,
      };
    }

    // Log error details (with sensitive data filtering in production)
    this.logError(request, exception, status, errorResponse);

    // Send response
    response.status(status).json(errorResponse);
  }

  /**
   * Log error with appropriate detail level based on environment
   */
  private logError(
    request: Request,
    exception: unknown,
    status: number,
    errorResponse: any,
  ) {
    const errorLog = {
      method: request.method,
      url: request.url,
      statusCode: status,
      errorCode: errorResponse.error?.code,
      message: errorResponse.error?.message,
      userId: (request as any).user?.id,
      ipAddress: request.ip || request.socket.remoteAddress,
      userAgent: request.headers['user-agent'],
      timestamp: errorResponse.timestamp,
      stack: exception instanceof Error ? exception.stack : undefined,
    };

    // In production, don't log sensitive request data
    if (process.env.NODE_ENV === 'production') {
      this.logger.error(
        `[${errorLog.errorCode}] ${request.method} ${request.url} - Status ${status}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      // In development, log full details
      this.logger.error(
        `[${errorLog.errorCode}] ${request.method} ${request.url} - Status ${status}`,
        exception instanceof Error ? exception.stack : undefined,
      );
      console.error(
        'Error Details:',
        JSON.stringify(
          {
            ...errorLog,
            headers: request.headers,
            body: this.sanitizeBody(request.body),
            query: request.query,
          },
          null,
          2,
        ),
      );
    }
  }

  /**
   * Sanitize request body to remove sensitive fields
   */
  private sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sanitized = { ...body };
    const sensitiveFields = [
      'password',
      'token',
      'refreshToken',
      'accessToken',
      'secret',
    ];

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '***REDACTED***';
      }
    }

    return sanitized;
  }

  /**
   * Get error code from HTTP status
   */
  private getErrorCodeFromStatus(status: number): string {
    const statusCodeMap: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'UNPROCESSABLE_ENTITY',
      429: 'TOO_MANY_REQUESTS',
      500: 'INTERNAL_SERVER_ERROR',
      502: 'BAD_GATEWAY',
      503: 'SERVICE_UNAVAILABLE',
    };

    return statusCodeMap[status] || 'UNKNOWN_ERROR';
  }
}
