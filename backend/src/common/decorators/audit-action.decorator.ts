import { SetMetadata } from '@nestjs/common';

export const AUDIT_ACTION_KEY = 'audit_action';
export const AuditAction = (action: string, entityType?: string) =>
  SetMetadata(AUDIT_ACTION_KEY, { action, entityType });
