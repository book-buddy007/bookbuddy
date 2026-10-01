'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  getUsers, 
  getUserStats, 
  createUser, 
  toggleUserStatus, 
  assignTenantRole,
  assignCollections,
  getInstitutions 
} from '@/lib/api/adminApi';
import { Institution } from '@/types/admin';
import { StatCard } from '@/components/ui/stat-card';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { DataTable, type DataColumn } from '@/components/ui/data-table';
import { Icon } from '@/components/ui/icon';
import { PageHeader } from '@/components/ui/page-header';
import { SearchInput } from '@/components/ui/search-input';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { useToast } from '@/components/ui/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

import { UserDetailSheet } from './components/UserDetailSheet';
import { AddUserSheet } from './components/AddUserSheet';
import { AssignTenantRoleDialog } from './components/AssignTenantRoleDialog';
import { AssignCollectionsDialog } from './components/AssignCollectionsDialog';

export default function UsersPage() {
  const { toast } = useToast();
  
  // Data state
  const [users, setUsers] = useState<any[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [stats, setStats] = useState({ totalUsers: 0, superAdmins: 0, activeToday: 0 });
  const [paginationData, setPaginationData] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);

  // Filters state
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All Roles');
  const [statusFilter, setStatusFilter] = useState('All');
  const [tenantFilter, setTenantFilter] = useState('All Institutions');
  const [pageClass, setPageClass] = useState(1);
  const [limitClass, setLimitClass] = useState(10);

  // Dialog state
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isAssignCollectionsOpen, setIsAssignCollectionsOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Load institutions once
  useEffect(() => {
    const fetchInsts = async () => {
      const res = await getInstitutions();
      if (res.success && res.data) {
        setInstitutions(res.data);
      }
    };
    fetchInsts();
  }, []);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPageClass(1); // Reset to page 1 on new search
    }, 500);
    return () => clearTimeout(handler);
  }, [search]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    
    const tenantIdParam = tenantFilter !== 'All Institutions' ? tenantFilter : undefined;
    
    // Fetch users and stats in parallel
    const [statsRes, usersRes] = await Promise.all([
      getUserStats(tenantIdParam),
      getUsers({
        page: pageClass,
         limit: limitClass,
        search: debouncedSearch || undefined,
        role: roleFilter !== 'All Roles' ? roleFilter : undefined,
        status: statusFilter !== 'All' ? statusFilter : undefined,
        tenantId: tenantIdParam
      })
    ]);

    if (statsRes.success && statsRes.data) {
      setStats(statsRes.data);
    }
    
    if (usersRes.success && usersRes.data) {
      setUsers(usersRes.data.data);
      setPaginationData(usersRes.data.pagination);
    } else {
      toast({ title: 'Error', description: usersRes.error || 'Failed to fetch users', variant: 'destructive' });
    }
    
    setIsLoading(false);
  }, [debouncedSearch, roleFilter, statusFilter, tenantFilter, pageClass, limitClass, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handlers
  const handleCreateUser = async (data: any) => {
    setIsActionLoading(true);
    const res = await createUser(data);
    setIsActionLoading(false);
    if (res.success) {
      toast({ title: 'User created' });
      setIsCreateOpen(false);
      loadData();
    } else {
      toast({ title: 'Error', description: res.error, variant: 'destructive' });
    }
  };

  const handleToggleStatus = async (user: any) => {
    const res = await toggleUserStatus(user.id);
    if (res.success) {
      toast({ title: 'Status updated' });
      loadData();
    } else {
      toast({ title: 'Error', description: res.error, variant: 'destructive' });
    }
  };

  const handleAssignRole = async (userId: string, tenantId: string, role: string) => {
    setIsActionLoading(true);
    const res = await assignTenantRole(userId, tenantId, role);
    setIsActionLoading(false);
    if (res.success) {
      toast({ title: 'Role assigned' });
      setIsAssignOpen(false);
      loadData();
    } else {
      toast({ title: 'Error', description: res.error, variant: 'destructive' });
    }
  };

  const handleAssignCollections = async (userId: string, tenantId: string, collections: string[]) => {
    setIsActionLoading(true);
    const res = await assignCollections(userId, tenantId, collections);
    setIsActionLoading(false);
    if (res.success) {
      toast({ title: 'Collections assigned' });
      setIsAssignCollectionsOpen(false);
      loadData();
    } else {
      toast({ title: 'Error', description: res.error, variant: 'destructive' });
    }
  };

  const getInitials = (name: string) => {
    return name?.split(' ').map((n) => n[0]).join('').toUpperCase().substring(0, 2) || 'U';
  };

  const columns: DataColumn<any>[] = [
    {
      key: 'user',
      header: 'User',
      cell: (user) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src={`https://avatar.vercel.sh/${user.email}`} />
            <AvatarFallback className="bg-bb-navy text-xs font-bold text-white">{getInitials(user.name)}</AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-semibold">{user.name}</span>
            <span className="truncate text-xs text-bb-muted">{user.email}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Global role',
      cell: (user) => <Chip className="capitalize">{user.role?.replace('_', ' ') || 'User'}</Chip>,
    },
    {
      key: 'memberships',
      header: 'Memberships',
      className: 'hidden md:table-cell',
      cell: (user) => (
        <div className="flex flex-col items-start gap-1">
          {user.tenantMemberships && user.tenantMemberships.length > 0 ? (
            user.tenantMemberships.slice(0, 2).map((m: any, i: number) => (
              <Chip key={i} className="h-6 text-xs">
                {m.tenant?.name} <span className="text-bb-accent-ink">({m.role.toLowerCase()})</span>
              </Chip>
            ))
          ) : (
            <span className="text-xs text-bb-muted">Independent</span>
          )}
          {user.tenantMemberships && user.tenantMemberships.length > 2 && (
            <span className="text-xs font-semibold text-bb-accent-ink">+{user.tenantMemberships.length - 2} more</span>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (user) =>
        user.isActive ? <StatusBadge status="returned" label="Active" /> : <StatusBadge status="overdue" label="Suspended" />,
    },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      className: 'w-12 text-right',
      cell: (user) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${user.name}`}>
              <Icon name="more-v" size={18} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[210px]">
            <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setTimeout(() => { setSelectedUser(user); setIsDetailOpen(true); }, 100); }}>
              <Icon name="eye" size={16} className="mr-2" /> View details
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setTimeout(() => { setSelectedUser(user); setIsAssignOpen(true); }, 100); }}>
              <Icon name="institution" size={16} className="mr-2" /> Assign to institution
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setTimeout(() => { setSelectedUser(user); setIsAssignCollectionsOpen(true); }, 100); }}>
              <Icon name="shield-check" size={16} className="mr-2" /> Manage collections
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleToggleStatus(user)} className={user.isActive ? 'text-bb-danger-ink' : undefined}>
              {user.isActive ? (
                <><Icon name="lock" size={16} className="mr-2" /> Suspend user</>
              ) : (
                <><Icon name="user-check" size={16} className="mr-2" /> Activate user</>
              )}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        className="mb-0"
        eyebrow="Access control"
        title="User management"
        description="Manage global users, platform roles, and institution memberships."
        actions={
          <Button size="lg" onClick={() => { setSelectedUser(null); setIsCreateOpen(true); }}>
            <Icon name="plus" size={18} /> Add user
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard variant="featured" title="Total users" value={stats.totalUsers} icon="class" loading={isLoading} />
        <StatCard title="Super admins" value={stats.superAdmins} icon="shield-check" loading={isLoading} />
        <StatCard title="Active today" value={stats.activeToday} icon="profile" loading={isLoading} />
      </div>

      <section className="space-y-4">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 sm:flex-row">
            <SearchInput
              wrapperClassName="flex-1"
              placeholder="Search users by name or email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Button variant="outline" size="icon-md" onClick={() => loadData()} title="Refresh data" aria-label="Refresh data" className="shrink-0">
              <Icon name="rotate-cw" size={18} className={isLoading ? 'animate-spin' : ''} />
            </Button>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Select value={tenantFilter} onValueChange={(v) => { setTenantFilter(v); setPageClass(1); }}>
              <SelectTrigger className="w-full sm:flex-1" aria-label="Institution">
                <SelectValue placeholder="All institutions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All Institutions">All institutions</SelectItem>
                {institutions.map(inst => (
                  <SelectItem key={inst.id} value={inst.id}>{inst.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPageClass(1); }}>
              <SelectTrigger className="w-full sm:w-[170px]" aria-label="Role">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All Roles">All roles</SelectItem>
                <SelectItem value="super_admin">Super admin</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="librarian">Librarian</SelectItem>
                <SelectItem value="teacher">Teacher</SelectItem>
                <SelectItem value="student">Student</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPageClass(1); }}>
              <SelectTrigger className="w-full sm:w-[150px]" aria-label="Status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All status</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DataTable
          columns={columns}
          rows={users}
          rowKey={(u) => u.id}
          loading={isLoading}
          emptyIcon="search"
          emptyTitle="No users found"
          emptyDescription="No users match your filters."
        />

        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <div className="flex items-center gap-3">
            <span className="text-sm text-bb-muted">Rows per page</span>
            <Select value={limitClass.toString()} onValueChange={(v) => { setLimitClass(parseInt(v)); setPageClass(1); }}>
              <SelectTrigger className="h-9 w-[80px]" aria-label="Rows per page">
                <SelectValue placeholder="10" />
              </SelectTrigger>
              <SelectContent>
                {[10, 25, 50, 100].map(v => (
                  <SelectItem key={v} value={v.toString()}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="ml-2 hidden text-sm text-bb-muted sm:inline-block">
              {paginationData.total === 0
                ? 'No entries'
                : `Showing ${(pageClass - 1) * limitClass + 1} to ${Math.min(pageClass * limitClass, paginationData.total)} of ${paginationData.total}`}
            </span>
          </div>
          <Pagination className="mx-0 w-auto">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setPageClass(p => Math.max(1, p - 1))}
                  className={pageClass === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
              <PaginationItem>
                <PaginationLink isActive>{pageClass}</PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  onClick={() => setPageClass(p => Math.min(paginationData.totalPages, p + 1))}
                  className={pageClass >= paginationData.totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </section>

      <UserDetailSheet
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        user={selectedUser}
      />

      <AddUserSheet
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        institutions={institutions}
        onSubmit={handleCreateUser}
        isLoading={isActionLoading}
      />

      <AssignTenantRoleDialog
        open={isAssignOpen}
        onOpenChange={setIsAssignOpen}
        user={selectedUser}
        institutions={institutions}
        onSubmit={handleAssignRole}
        isLoading={isActionLoading}
      />

      <AssignCollectionsDialog
        open={isAssignCollectionsOpen}
        onOpenChange={setIsAssignCollectionsOpen}
        user={selectedUser}
        institutions={institutions}
        onSubmit={handleAssignCollections}
        isLoading={isActionLoading}
      />
    </div>
  );
}
