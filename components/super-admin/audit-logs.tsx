"use client"

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { format, formatDistanceToNow } from 'date-fns';
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
    return <div className="py-6 text-center text-sm text-muted-foreground">Loading audit logs...</div>;
  }

  if (error) {
    return <div className="py-6 text-center text-sm text-red-500">{error}</div>;
  }

  if (logs.length === 0) {
    return <div className="py-6 text-center text-sm text-muted-foreground">No audit logs found</div>;
  }

  return (
    <div className="space-y-4">
      {logs.map((log) => (
        <div key={log.id} className="flex items-start space-x-4 pb-4 border-b border-border last:border-0 last:pb-0">
          <Avatar className="h-8 w-8 mt-1 ring-2 ring-amber-100">
            <AvatarFallback className="bg-amber-100 text-amber-700 font-bold">
              {log.user?.name?.substring(0, 2).toUpperCase() || log.userId?.substring(0, 2).toUpperCase() || '??'}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-1 flex-1">
            <p className="text-sm text-slate-800">
              <span className="font-bold text-bb-text">{log.user?.name || log.userId || 'System'}</span>
              {' '}
              <span className="text-bb-muted font-medium">
                {getActionLabel(log.action)} a {getResourceTypeLabel(log.entityType)}
                {log.entityId && (
                  <span className="text-[10px] bg-amber-100 text-amber-800 rounded px-1.5 py-0.5 ml-1 font-bold">
                    ID: {log.entityId}
                  </span>
                )}
              </span>
            </p>
            <p className="text-xs text-bb-muted/70 font-medium italic">
              {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
            </p>
          </div>
        </div>
      ))}

      {limit && logs.length >= limit && (
        <div className="pt-2 text-center">
          <Button variant="link" className="text-amber-700 hover:text-amber-900 font-bold" asChild>
            <Link href="/dashboard/super-admin/audit">View all audit logs</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
