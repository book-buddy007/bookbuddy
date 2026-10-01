import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { PrismaService } from '../../prisma/prisma.service';
import { AUDIT_ACTION_KEY } from '../decorators/audit-action.decorator';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const meta = this.reflector.get<{ action: string; entityType?: string }>(
      AUDIT_ACTION_KEY,
      context.getHandler(),
    );

    if (!meta) return next.handle(); // Not decorated → skip

    const req = context.switchToHttp().getRequest();
    const startTime = Date.now();

    return next.handle().pipe(
      tap(async (responseData) => {
        try {
          // AuditLog model removed from schema — no-op
          // Original code wrote audit log entries here
          const resolvedEntityId = responseData?.id || req.params?.id || null;
          console.debug(
            '[AuditLog] SUCCESS (stubbed):',
            meta.action,
            resolvedEntityId,
          );
        } catch (auditErr) {
          // Never block the main response if audit fails
          console.error('[AuditLog] Failed to write SUCCESS log:', auditErr);
        }
      }),
      catchError((err) => {
        // AuditLog model removed — just log to console
        console.warn(
          '[AuditLog] FAILURE audit (model removed):',
          meta.action,
          err.message,
        );
        throw err; // Rethrow to let the global exception filter handle it
      }),
    );
  }
}
