'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { DataTable, type DataColumn } from '@/components/ui/data-table';
import { FormField } from '@/components/ui/form-field';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { SearchInput } from '@/components/ui/search-input';
import { StatCard } from '@/components/ui/stat-card';
import { StatusBadge, toBBStatus } from '@/components/ui/status-badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
} from '@/components/ui/pagination';
import { useToast } from '@/components/ui/use-toast';
import { getAuditLogs } from '@/lib/api/adminApi';
import type { AuditLog } from '@/types/admin';

const ITEMS_PER_PAGE = 10;

const ACTIONS = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT'];

const actorOf = (log: AuditLog) => log.user?.email || log.user?.name || log.userId || 'System';

const detailsOf = (log: AuditLog): string => {
  const m = log.metadata;
  if (!m) return '';
  if (typeof m === 'string') return m;
  if (typeof m === 'object') return m.details || m.message || m.description || '';
  return '';
};

const download = (filename: string, mime: string, body: string) => {
  const url = URL.createObjectURL(new Blob([body], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const csvCell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;

export default function AuditLogPage() {
  const { toast } = useToast();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [currentPage, setCurrentPage] = useState(1);

  const loadLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const res = await getAuditLogs({
      startDate: dateRange.start || undefined,
      endDate: dateRange.end || undefined,
    });
    if (res.success && res.data) {
      setLogs(res.data);
    } else {
      setError(res.error || 'Failed to fetch audit logs');
    }
    setIsLoading(false);
  }, [dateRange.start, dateRange.end]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const statuses = useMemo(
    () => Array.from(new Set(logs.map((l) => l.status).filter(Boolean))) as string[],
    [logs]
  );

  const filteredLogs = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return logs.filter((log) => {
      if (q) {
        const hay = [log.action, actorOf(log), log.entityType, log.entityId, log.ipAddress, detailsOf(log)]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (actionFilter !== 'all' && log.action !== actionFilter) return false;
      if (roleFilter !== 'all' && log.user?.role !== roleFilter) return false;
      if (statusFilter !== 'all' && log.status !== statusFilter) return false;
      return true;
    });
  }, [logs, searchTerm, actionFilter, roleFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / ITEMS_PER_PAGE));
  const page = Math.min(currentPage, totalPages);
  const paginatedLogs = filteredLogs.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const resetFilters = () => {
    setSearchTerm('');
    setActionFilter('all');
    setRoleFilter('all');
    setStatusFilter('all');
    setDateRange({ start: '', end: '' });
    setCurrentPage(1);
  };

  const exportLogs = (format: 'CSV' | 'JSON') => {
    if (filteredLogs.length === 0) {
      toast({ title: 'Nothing to export', description: 'No audit logs match the current filters.' });
      return;
    }
    const stamp = new Date().toISOString().slice(0, 10);
    if (format === 'JSON') {
      download(`audit-logs-${stamp}.json`, 'application/json', JSON.stringify(filteredLogs, null, 2));
    } else {
      const header = ['Timestamp', 'Action', 'User', 'Role', 'Entity', 'Entity ID', 'Status', 'IP address', 'Details'];
      const rows = filteredLogs.map((l) => [
        l.createdAt, l.action, actorOf(l), l.user?.role ?? '', l.entityType ?? '', l.entityId ?? '', l.status ?? '', l.ipAddress ?? '', detailsOf(l),
      ]);
      download(`audit-logs-${stamp}.csv`, 'text/csv', [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\n'));
    }
  };

  const columns: DataColumn<AuditLog>[] = [
    { key: 'time', header: 'Timestamp', cell: (l) => new Date(l.createdAt).toLocaleString(), className: 'whitespace-nowrap text-bb-muted' },
    { key: 'action', header: 'Action', cell: (l) => <Chip>{l.action}</Chip> },
    {
      key: 'user',
      header: 'User',
      cell: (l) => (
        <>
          <div>{actorOf(l)}</div>
          {l.user?.role && <div className="hidden text-xs capitalize text-bb-muted md:block">{l.user.role}</div>}
        </>
      ),
    },
    {
      key: 'entity',
      header: 'Entity',
      className: 'hidden md:table-cell',
      cell: (l) => (l.entityType ? `${l.entityType}${l.entityId ? ` (${l.entityId})` : ''}` : '—'),
    },
    { key: 'details', header: 'Details', cell: (l) => detailsOf(l) || <span className="text-bb-muted">—</span> },
    {
      key: 'status',
      header: 'Status',
      className: 'hidden md:table-cell',
      cell: (l) =>
        l.status ? <StatusBadge status={toBBStatus(l.status)} label={l.status.charAt(0).toUpperCase() + l.status.slice(1).toLowerCase()} /> : <span className="text-bb-muted">—</span>,
    },
  ];

  const success = logs.filter((l) => toBBStatus(l.status) === 'returned' && l.status).length;
  const failed = logs.filter((l) => toBBStatus(l.status) === 'overdue').length;

  return (
    <div className="space-y-8">
      <PageHeader
        className="mb-0"
        eyebrow="Super admin"
        title="Audit logs"
        description="Track system activities, user actions, and security events."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => exportLogs('CSV')}>
              <Icon name="download" size={16} /> Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportLogs('JSON')}>
              <Icon name="download" size={16} /> Export JSON
            </Button>
            <Button size="sm" onClick={loadLogs} disabled={isLoading}>
              <Icon name="rotate-cw" size={16} className={isLoading ? 'animate-spin' : ''} /> Refresh
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard variant="featured" title="Total events" value={logs.length} description="Loaded for this range" icon="analytics" loading={isLoading} />
        <StatCard title="Successful actions" value={success} description="Completed successfully" icon="check-circle" loading={isLoading} />
        <StatCard title="Failed actions" value={failed} description="Require attention" icon="alert" loading={isLoading} />
        <StatCard title="Unique users" value={new Set(logs.map(actorOf)).size} description="Active users" icon="class" loading={isLoading} />
      </div>

      <section className="space-y-4 rounded-[22px] bg-bb-surface p-5 shadow-e1 sm:p-6">
        <div>
          <h2 className="font-display text-lg font-extrabold tracking-[-0.02em]">Filters</h2>
          <p className="text-[13px] text-bb-muted">Narrow down audit logs with specific criteria</p>
        </div>

        <div className="flex flex-col gap-3 md:flex-row">
          <SearchInput
            wrapperClassName="flex-1"
            placeholder="Search logs"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          />
          <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setCurrentPage(1); }}>
            <SelectTrigger className="md:w-44" aria-label="Action"><SelectValue placeholder="Action" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actions</SelectItem>
              {ACTIONS.map((a) => (
                <SelectItem key={a} value={a}>{a.charAt(0) + a.slice(1).toLowerCase()}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setCurrentPage(1); }}>
            <SelectTrigger className="md:w-44" aria-label="User role"><SelectValue placeholder="User role" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All users</SelectItem>
              <SelectItem value="super-admin">Super admin</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="librarian">Librarian</SelectItem>
              <SelectItem value="user">User</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
            <SelectTrigger className="md:w-44" aria-label="Status"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {statuses.map((s) => (
                <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <FormField label="Start date" htmlFor="audit-start" className="flex-1">
            <Input id="audit-start" type="date" value={dateRange.start} onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })} />
          </FormField>
          <FormField label="End date" htmlFor="audit-end" className="flex-1">
            <Input id="audit-end" type="date" value={dateRange.end} onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })} />
          </FormField>
          <Button variant="outline" onClick={resetFilters}>
            <Icon name="rotate-ccw" size={16} /> Reset filters
          </Button>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="font-display text-xl font-extrabold tracking-[-0.02em]">Audit log records</h2>
          <p className="text-[13px] text-bb-muted">
            Showing {paginatedLogs.length} of {filteredLogs.length} records
          </p>
        </div>

        {error ? (
          <div role="alert" className="flex items-center gap-3 rounded-[18px] bg-bb-danger-soft px-5 py-4 text-sm font-semibold text-bb-danger-ink">
            <Icon name="alert-circle" size={20} />
            <span className="flex-1">{error}</span>
            <button onClick={loadLogs} className="underline">Retry</button>
          </div>
        ) : (
          <DataTable
            columns={columns}
            rows={paginatedLogs}
            rowKey={(l) => l.id}
            loading={isLoading}
            emptyIcon="search"
            emptyTitle="No audit logs found"
            emptyDescription="No logs match the current filters."
          />
        )}

        {totalPages > 1 && (
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => { e.preventDefault(); if (page > 1) setCurrentPage(page - 1); }}
                  aria-disabled={page === 1}
                  className={page === 1 ? 'pointer-events-none opacity-50' : ''}
                />
              </PaginationItem>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                // Window of up to 5 pages around the current page
                let pageNum = i + 1;
                if (totalPages > 5) {
                  if (page > 3) pageNum = i + page - 2;
                  if (page > totalPages - 2) pageNum = totalPages - 4 + i;
                }
                return pageNum <= totalPages ? (
                  <PaginationItem key={pageNum}>
                    <PaginationLink
                      href="#"
                      onClick={(e) => { e.preventDefault(); setCurrentPage(pageNum); }}
                      isActive={page === pageNum}
                    >
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                ) : null;
              })}
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => { e.preventDefault(); if (page < totalPages) setCurrentPage(page + 1); }}
                  aria-disabled={page === totalPages}
                  className={page === totalPages ? 'pointer-events-none opacity-50' : ''}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </section>
    </div>
  );
}
