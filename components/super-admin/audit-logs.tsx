"use client"

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Chip } from '@/components/ui/chip';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { getAuditLogs } from '@/lib/api/adminApi';
import { AuditLog } from '@/types/admin';

interface AuditLogsProps {
  limit?: number;
  institutionId?: string;
  userId?: string;
}

export function AuditLogs({ limit, institutionId, userId }: AuditLogsProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 2;

    const fetchAuditLogs = async () => {
      setIsLoading(true);
      try {
        const response = await getAuditLogs({
          institutionId,
          userId,
        });

        if (response.success && response.data) {
          // Apply limit if provided
          const limitedData = limit ? response.data.slice(0, limit) : response.data;
          setLogs(limitedData);
        } else {
          // Retry on failure if backend might still be starting
          if (retryCount < maxRetries) {
            retryCount++;
            setTimeout(fetchAuditLogs, 2000);
            return;
          }
          setError(response.error || 'Failed to fetch audit logs');
        }
      } catch (err) {
        if (retryCount < maxRetries) {
          retryCount++;
          setTimeout(fetchAuditLogs, 2000);
          return;
        }
        setError('An error occurred while fetching audit logs');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAuditLogs();
  }, [limit, institutionId, userId]);

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'CREATE':
        return 'Created';
      case 'UPDATE':
        return 'Updated';
      case 'DELETE':
        return 'Deleted';
      case 'LOGIN':
        return 'Logged in';
      case 'LOGOUT':
        return 'Logged out';
      default:
        return action;
    }
  };

  const getResourceTypeLabel = (type?: string) => {
    if (!type) return 'Resource';
    return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-start gap-3">
            <Skeleton className="h-9 w-9 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-4/5" />
              <Skeleton className="h-3 w-1/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return <p role="alert" className="py-6 text-center text-sm font-semibold text-bb-danger-ink">{error}</p>;
  }

  if (logs.length === 0) {
    return <p className="py-6 text-center text-sm text-bb-muted">No audit logs found</p>;
  }

  return (
    <div className="space-y-4">
      {logs.map((log) => (
        <div key={log.id} className="flex items-start gap-3 border-b border-bb-border pb-4 last:border-0 last:pb-0">
          <Avatar className="mt-0.5 h-9 w-9">
            <AvatarFallback className="bg-bb-accent-soft text-xs font-bold text-bb-accent-ink">
              {log.user?.name?.substring(0, 2).toUpperCase() || log.userId?.substring(0, 2).toUpperCase() || '??'}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-sm">
              <span className="font-semibold">{log.user?.name || log.userId || 'System'}</span>{' '}
              <span className="text-bb-muted">
                {getActionLabel(log.action)} a {getResourceTypeLabel(log.entityType)}
              </span>
              {log.entityId && <Chip className="ml-1.5 h-5 px-2 align-middle text-[11px]">ID: {log.entityId}</Chip>}
            </p>
            <p className="text-xs text-bb-muted">
              {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
            </p>
          </div>
        </div>
      ))}

      {limit && logs.length >= limit && (
        <div className="pt-1 text-center">
          <Button variant="link" asChild>
            <Link href="/dashboard/super-admin/audit">View all audit logs</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
