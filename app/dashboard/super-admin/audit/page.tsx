'use client';

import { useState } from 'react';
import { EnhancedButton } from '@/components/ui/enhanced-button';
import { EnhancedCard, EnhancedCardContent, EnhancedCardDescription, EnhancedCardHeader, EnhancedCardTitle } from "@/components/ui/enhanced-card";
import { StatCard } from '@/components/ui/stat-card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Download, Search, Filter, RefreshCw, Shield, Activity, AlertTriangle, CheckCircle2 } from '@/components/ui/icons';
import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
} from '@/components/ui/pagination';

// Mock data for audit logs
const mockAuditLogs = [
  {
    id: 'log-1',
    action: 'user.login',
    user: 'admin@example.com',
    userType: 'admin',
    entity: 'User',
    entityId: 'user-123',
    details: 'Admin logged in successfully',
    timestamp: '2023-06-15T09:24:15Z',
    ipAddress: '192.168.1.1',
    status: 'success',
  },
  {
    id: 'log-2',
    action: 'institution.create',
    user: 'admin@example.com',
    userType: 'super-admin',
    entity: 'Institution',
    entityId: 'inst-456',
    details: 'Created new institution: Springfield High School',
    timestamp: '2023-06-14T15:30:22Z',
    ipAddress: '192.168.1.1',
    status: 'success',
  },
  {
    id: 'log-3',
    action: 'user.create',
    user: 'librarian@springfield.edu',
    userType: 'librarian',
    entity: 'User',
    entityId: 'user-789',
    details: 'Created new student account',
    timestamp: '2023-06-14T10:15:30Z',
    ipAddress: '192.168.1.100',
    status: 'success',
  },
  {
    id: 'log-4',
    action: 'book.add',
    user: 'librarian@springfield.edu',
    userType: 'librarian',
    entity: 'Book',
    entityId: 'book-101',
    details: 'Added new book: The Great Gatsby',
    timestamp: '2023-06-13T16:42:10Z',
    ipAddress: '192.168.1.100',
    status: 'success',
  },
  {
    id: 'log-5',
    action: 'user.password_reset',
    user: 'student@springfield.edu',
    userType: 'student',
    entity: 'User',
    entityId: 'user-456',
    details: 'Password reset requested',
    timestamp: '2023-06-12T09:18:45Z',
    ipAddress: '192.168.1.150',
    status: 'success',
  },
  {
    id: 'log-6',
    action: 'login.failed',
    user: 'unknown',
    userType: 'anonymous',
    entity: 'User',
    entityId: 'unknown',
    details: 'Failed login attempt for admin@example.com',
    timestamp: '2023-06-11T22:05:12Z',
    ipAddress: '192.168.10.45',
    status: 'failed',
  },
  {
    id: 'log-7',
    action: 'settings.update',
    user: 'admin@example.com',
    userType: 'super-admin',
    entity: 'Settings',
    entityId: 'global',
    details: 'Updated system notification settings',
    timestamp: '2023-06-10T11:30:00Z',
    ipAddress: '192.168.1.1',
    status: 'success',
  },
];

// Function to simulate exporting data
const exportAuditLogs = (format: 'CSV' | 'JSON') => {
  console.log(`Exporting audit logs as ${format}`);
  alert(`${format} export would happen here in a real implementation`);
};

export default function AuditLogPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [userTypeFilter, setUserTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5; // Number of logs per page

  // Filter logs based on current filters
  const filteredLogs = mockAuditLogs.filter(log => {
    // Search term filter
    const searchLower = searchTerm.toLowerCase();
    if (searchTerm && !Object.values(log).some(value => 
      String(value).toLowerCase().includes(searchLower)
    )) {
      return false;
    }
    
    // Action filter
    if (actionFilter !== 'all' && !log.action.startsWith(actionFilter)) {
      return false;
    }
    
    // User type filter
    if (userTypeFilter !== 'all' && log.userType !== userTypeFilter) {
      return false;
    }
    
    // Status filter
    if (statusFilter !== 'all' && log.status !== statusFilter) {
      return false;
    }
    
    // Date range filter
    if (dateRange.start && new Date(log.timestamp) < new Date(dateRange.start)) {
      return false;
    }
    if (dateRange.end && new Date(log.timestamp) > new Date(dateRange.end)) {
      return false;
    }
    
    return true;
  });

  // Paginate the filtered logs
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Calculate total pages
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);

  // Refresh logs (would fetch fresh data from the server in a real implementation)
  const refreshLogs = () => {
    console.log('Refreshing logs...');
    // This would trigger an API call to fetch updated logs
  };

  // Reset all filters
  const resetFilters = () => {
    setSearchTerm('');
    setActionFilter('all');
    setUserTypeFilter('all');
    setStatusFilter('all');
    setDateRange({ start: '', end: '' });
    setCurrentPage(1);
  };

  // Format timestamp for display
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="space-y-8 animate-vg-fade-in">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-blue-700 to-cyan-600 bg-clip-text text-transparent flex items-center gap-3">
            <Shield className="h-10 w-10 text-blue-700 dark:text-blue-500" />
            Audit Logs
          </h1>
          <p className="text-muted-foreground text-lg">
            Track system activities, user actions, and security events
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <EnhancedButton variant="outline" size="sm" onClick={() => exportAuditLogs('CSV')} icon={<Download className="h-4 w-4" />}>
            Export CSV
          </EnhancedButton>
          <EnhancedButton variant="outline" size="sm" onClick={() => exportAuditLogs('JSON')} icon={<Download className="h-4 w-4" />}>
            Export JSON
          </EnhancedButton>
          <EnhancedButton variant="vg-primary" size="sm" onClick={refreshLogs} icon={<RefreshCw className="h-4 w-4" />}>
            Refresh
          </EnhancedButton>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          title="Total Events"
          value={mockAuditLogs.length.toString()}
          description="All time"
          icon={Activity}
          iconColor="text-blue-700 dark:text-blue-500"
          iconBgColor="bg-blue-50 dark:bg-blue-900/20"
          variant="primary"
        />
        <StatCard
          title="Successful Actions"
          value={mockAuditLogs.filter(l => l.status === 'success').length.toString()}
          description="Completed successfully"
          icon={CheckCircle2}
          iconColor="text-vg-success-600"
          iconBgColor="bg-vg-success-50 dark:bg-vg-success-900/20"
          variant="success"
        />
        <StatCard
          title="Failed Actions"
          value={mockAuditLogs.filter(l => l.status === 'failed').length.toString()}
          description="Require attention"
          icon={AlertTriangle}
          iconColor="text-vg-error-600"
          iconBgColor="bg-vg-error-50 dark:bg-vg-error-900/20"
          variant="error"
        />
        <StatCard
          title="Unique Users"
          value={new Set(mockAuditLogs.map(l => l.user)).size.toString()}
          description="Active users"
          icon={Shield}
          iconColor="text-teal-600 dark:text-teal-500"
          iconBgColor="bg-teal-50 dark:bg-teal-900/20"
          variant="cultural"
        />
      </div>

      {/* Filters Card */}
      <EnhancedCard variant="elevated">
        <EnhancedCardHeader className="pb-3">
          <EnhancedCardTitle className="text-lg bg-gradient-to-r from-blue-700 to-cyan-600 bg-clip-text text-transparent">
            Filters
          </EnhancedCardTitle>
          <EnhancedCardDescription>Narrow down audit logs with specific criteria</EnhancedCardDescription>
        </EnhancedCardHeader>
        <EnhancedCardContent>
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search logs..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              {/* Action Filter */}
              <div className="md:w-48">
                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    <SelectItem value="user">User Actions</SelectItem>
                    <SelectItem value="institution">Institution Actions</SelectItem>
                    <SelectItem value="book">Book Actions</SelectItem>
                    <SelectItem value="login">Login Actions</SelectItem>
                    <SelectItem value="settings">Settings Actions</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* User Type Filter */}
              <div className="md:w-48">
                <Select value={userTypeFilter} onValueChange={setUserTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="User Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    <SelectItem value= "SUPER_ADMIN">Super Admin</SelectItem>
                    <SelectItem value= "ADMIN">Admin</SelectItem>
                    <SelectItem value= "LIBRARIAN">Librarian</SelectItem>
                    <SelectItem value= "TEACHER">Teacher</SelectItem>
                    <SelectItem value= "STUDENT">Student</SelectItem>
                    <SelectItem value="anonymous">Anonymous</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status Filter */}
              <div className="md:w-48">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value= "PENDING">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1 grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Start Date</label>
                  <Input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">End Date</label>
                  <Input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                  />
                </div>
              </div>
              <Button variant="outline" onClick={resetFilters}>
                <Filter className="mr-2 h-4 w-4" />
                Reset Filters
              </Button>
            </div>
          </div>
        </EnhancedCardContent>
      </EnhancedCard>

      {/* Logs Table */}
      <EnhancedCard variant="elevated">
        <EnhancedCardHeader>
          <EnhancedCardTitle className="bg-gradient-to-r from-vg-primary-600 to-vg-sanskrit-600 bg-clip-text text-transparent">
            Audit Log Records
          </EnhancedCardTitle>
          <EnhancedCardDescription>
            Showing {paginatedLogs.length} of {filteredLogs.length} records
          </EnhancedCardDescription>
        </EnhancedCardHeader>
        <EnhancedCardContent>
          <div className="overflow-x-auto">
          <Table className="min-w-[640px]">
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>User</TableHead>
                <TableHead className="hidden md:table-cell">Entity</TableHead>
                <TableHead>Details</TableHead>
                <TableHead className="hidden md:table-cell">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedLogs.length > 0 ? (
                paginatedLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap">
                      {formatTimestamp(log.timestamp)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {log.action}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{log.user}</span>
                        <span className="text-xs text-muted-foreground hidden md:inline">
                          {log.userType}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {log.entity} ({log.entityId})
                    </TableCell>
                    <TableCell>
                      {log.details}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge 
                        variant={log.status === 'success' ? 'default' : 
                                log.status === 'failed' ? 'destructive' : 'outline'}
                      >
                        {log.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6">
                    No audit logs found matching the current filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          </div>

          {totalPages > 1 && (
            <div className="mt-4">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      href="#" 
                      onClick={(e) => {
                        e.preventDefault();
                        if (currentPage > 1) setCurrentPage(currentPage - 1);
                      }}
                      aria-disabled={currentPage === 1}
                      className={currentPage === 1 ? "opacity-50 pointer-events-none" : ""}
                    />
                  </PaginationItem>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    // Show a window of 5 pages around the current page
                    let pageNum = i + 1;
                    if (totalPages > 5) {
                      if (currentPage > 3) {
                        pageNum = i + currentPage - 2;
                      }
                      if (currentPage > totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      }
                    }
                    
                    if (pageNum <= totalPages) {
                      return (
                        <PaginationItem key={pageNum}>
                          <PaginationLink 
                            href="#" 
                            onClick={(e) => {
                              e.preventDefault();
                              setCurrentPage(pageNum);
                            }}
                            isActive={currentPage === pageNum}
                          >
                            {pageNum}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    }
                    return null;
                  })}
                  <PaginationItem>
                    <PaginationNext 
                      href="#" 
                      onClick={(e) => {
                        e.preventDefault();
                        if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                      }}
                      aria-disabled={currentPage === totalPages}
                      className={currentPage === totalPages ? "opacity-50 pointer-events-none" : ""}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </EnhancedCardContent>
      </EnhancedCard>
    </div>
  );
}