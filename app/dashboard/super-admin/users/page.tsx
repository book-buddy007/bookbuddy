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
import { StatPill } from '@/components/ui/stat-pill';
import { EnhancedButton } from '@/components/ui/enhanced-button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
import {
  Users,
  Shield,
  UserCircle,
  MoreVertical,
  Pencil,
  Trash2,
  Eye,
  Plus,
  RefreshCw,
  Search,
  Filter,
  Building2
} from '@/components/ui/icons';

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

  return (
    <div className="space-y-6 animate-vg-fade-in-up">
      {/* Header Section */}
      <div className="relative overflow-hidden rounded-3xl p-6 md:p-10 shadow-2xl mb-8 border border-white/10" style={{background: 'linear-gradient(135deg, var(--night-ink) 0%, var(--indigo-deep) 30%, var(--peacock-teal) 60%, var(--deep-saffron) 100%)'}}>
        <div className="absolute inset-0 opacity-30 pointer-events-none mix-blend-overlay" style={{backgroundImage: 'url("https://www.transparenttextures.com/patterns/cubes.png")'}} />
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/[0.03] rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-[var(--deep-saffron)]/[0.15] rounded-full blur-3xl translate-y-1/2 -translate-x-1/3" />
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm text-white backdrop-blur-md shadow-sm">
              <span className="flex h-2 w-2 rounded-full bg-[var(--deep-saffron)] mr-2 animate-pulse"></span>
              Access Control
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white drop-shadow-sm font-display">
               User Management
            </h1>
            <p className="text-indigo-100/90 text-lg max-w-xl font-medium">
               Manage global users, platform roles, and institution memberships.
            </p>
          </div>
          
          <EnhancedButton 
            size="lg"
            className="shrink-0 bg-gradient-to-r from-[var(--deep-saffron)] to-bb-accent hover:from-bb-accent hover:to-bb-accent text-black shadow-lg shadow-[var(--deep-saffron)]/20 border-transparent font-bold"
            onClick={() => { setSelectedUser(null); setIsCreateOpen(true); }}
          >
            <Plus className="h-5 w-5 mr-2" />
            Add User
          </EnhancedButton>
        </div>
      </div>

      {/* Stat Pills */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <StatPill
          label="Total Users"
          value={isLoading ? '...' : stats.totalUsers.toString()}
          icon={<Users className="h-5 w-5" />}
          accent="teal"
          isLoading={isLoading}
        />
        <StatPill
          label="Super Admins"
          value={isLoading ? '...' : stats.superAdmins.toString()}
          icon={<Shield className="h-5 w-5" />}
          accent="saffron"
          isLoading={isLoading}
          delayMs={100}
        />
        <StatPill
          label="Active Today"
          value={isLoading ? '...' : stats.activeToday.toString()}
          icon={<UserCircle className="h-5 w-5" />}
          accent="gold"
          isLoading={isLoading}
          delayMs={200}
        />
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col gap-3 bg-white/70 dark:bg-bb-bg/70 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-700/40 shadow-sm backdrop-blur-md">
        {/* Search row */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search users by name or email..."
              className="pl-10 bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 rounded-xl h-10 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-[var(--deep-saffron)]/40 focus:border-[var(--deep-saffron)]/40"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <EnhancedButton
            variant="outline"
            size="icon"
            onClick={() => loadData()}
            title="Refresh data"
            className="rounded-xl border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 h-10 w-10 shrink-0"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </EnhancedButton>
        </div>
        {/* Filter dropdowns row */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Select value={tenantFilter} onValueChange={(v) => { setTenantFilter(v); setPageClass(1); }}>
            <SelectTrigger className="w-full sm:flex-1 bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 rounded-xl h-10 text-slate-700 dark:text-slate-300">
              <SelectValue placeholder="All Institutions" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-200/60 dark:border-slate-700/40 bg-white dark:bg-bb-bg">
              <SelectItem value="All Institutions">All Institutions</SelectItem>
              {institutions.map(inst => (
                <SelectItem key={inst.id} value={inst.id}>{inst.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPageClass(1); }}>
            <SelectTrigger className="w-full sm:w-[160px] bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 rounded-xl h-10 text-slate-700 dark:text-slate-300">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-200/60 dark:border-slate-700/40 bg-white dark:bg-bb-bg">
              <SelectItem value="All Roles">All Roles</SelectItem>
              <SelectItem value="super_admin">Super Admin</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="librarian">Librarian</SelectItem>
              <SelectItem value="teacher">Teacher</SelectItem>
              <SelectItem value="student">Student</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPageClass(1); }}>
            <SelectTrigger className="w-full sm:w-[140px] bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 rounded-xl h-10 text-slate-700 dark:text-slate-300">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-200/60 dark:border-slate-700/40 bg-white dark:bg-bb-bg">
              <SelectItem value="All">All Status</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Inactive">Suspended</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200/60 dark:border-slate-700/40 bg-white/70 dark:bg-bb-bg/70 shadow-sm overflow-hidden backdrop-blur-md">
        <div className="overflow-x-auto">
          <Table className="min-w-[640px]">
            <TableHeader className="bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-200/60 dark:border-slate-700/40">
              <TableRow>
                <TableHead className="font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">User</TableHead>
                <TableHead className="font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">Global Role</TableHead>
                <TableHead className="font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider hidden md:table-cell">Memberships</TableHead>
                <TableHead className="font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">Status</TableHead>
                <TableHead className="font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><div className="h-10 w-40 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-xl" /></TableCell>
                    <TableCell><div className="h-5 w-20 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-lg" /></TableCell>
                    <TableCell className="hidden md:table-cell"><div className="h-5 w-32 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-lg" /></TableCell>
                    <TableCell><div className="h-6 w-16 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-full" /></TableCell>
                    <TableCell className="text-right"><div className="h-8 w-8 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-lg ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-slate-400 dark:text-slate-500">
                    <div className="flex flex-col items-center justify-center space-y-2">
                        <Users className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                        <p>No users found matching your filters.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors border-b border-slate-100 dark:border-slate-800/50 last:border-0">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="ring-2 ring-[var(--deep-saffron)]/20 h-9 w-9">
                          <AvatarImage src={`https://avatar.vercel.sh/${user.email}`} />
                          <AvatarFallback className="bg-gradient-to-br from-[var(--deep-saffron)]/20 to-[var(--saffron)]/10 text-[var(--deep-saffron)] font-bold text-xs">{getInitials(user.name)}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">{user.name}</span>
                          <span className="text-xs text-slate-400 dark:text-slate-500 truncate">{user.email}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                        <Badge variant="outline" className="capitalize text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 font-medium rounded-lg text-xs">
                           {user.role?.replace('_', ' ') || 'User'}
                        </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex flex-col gap-1">
                        {user.tenantMemberships && user.tenantMemberships.length > 0 ? (
                          user.tenantMemberships.slice(0, 2).map((m: any, i: number) => (
                            <Badge key={i} variant="secondary" className="w-fit text-[11px] bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 rounded-lg">
                              {m.tenant?.name} <span className="text-[var(--deep-saffron)] ml-1">({m.role.toLowerCase()})</span>
                            </Badge>
                          ))
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500 text-xs italic">Independent</span>
                        )}
                        {user.tenantMemberships && user.tenantMemberships.length > 2 && (
                          <span className="text-xs text-[var(--deep-saffron)] font-medium">+{user.tenantMemberships.length - 2} more</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={user.isActive ? 'default' : 'secondary'}
                        className={user.isActive 
                          ? 'bg-[var(--peacock-teal)]/15 text-[var(--peacock-teal)] dark:bg-[var(--peacock-teal)]/20 dark:text-emerald-300 border border-[var(--peacock-teal)]/20 font-semibold' 
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 font-semibold'}
                      >
                        {user.isActive ? 'Active' : 'Suspended'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <EnhancedButton variant="ghost" size="icon" className="h-8 w-8 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm text-slate-600 dark:text-slate-400 hover:text-[var(--deep-saffron)] hover:border-[var(--deep-saffron)]/30">
                            <MoreVertical className="h-4 w-4" />
                            <span className="sr-only">Open menu</span>
                          </EnhancedButton>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[200px] p-2 rounded-xl shadow-lg border-slate-200/60 dark:border-slate-700/40 bg-white dark:bg-bb-bg">
                          <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setTimeout(() => { setSelectedUser(user); setIsDetailOpen(true); }, 100); }} className="cursor-pointer rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium py-2 px-3 flex items-center gap-2">
                            <Eye className="h-4 w-4 text-[var(--peacock-teal)]" /> View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setTimeout(() => { setSelectedUser(user); setIsAssignOpen(true); }, 100); }} className="cursor-pointer rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium py-2 px-3 flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-[var(--deep-saffron)]" /> Assign to Institution
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setTimeout(() => { setSelectedUser(user); setIsAssignCollectionsOpen(true); }, 100); }} className="cursor-pointer rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium py-2 px-3 flex items-center gap-2">
                            <Shield className="h-4 w-4 text-[var(--gold)]" /> Manage Collections
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-800" />
                          <DropdownMenuItem onClick={() => handleToggleStatus(user)} className="cursor-pointer rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 text-amber-600 dark:text-amber-400 font-medium py-2 px-3 flex items-center gap-2">
                            {user.isActive ? (
                               <><UserCircle className="h-4 w-4" /> Suspend User</>
                            ) : (
                               <><Shield className="h-4 w-4 text-emerald-500" /> Activate User</>
                            )}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
        {/* Pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-slate-200/60 dark:border-slate-700/40 bg-slate-50/50 dark:bg-slate-800/20">
            <div className="flex items-center gap-3">
                <span className="text-sm text-slate-500 dark:text-slate-400">Rows per page</span>
                <Select value={limitClass.toString()} onValueChange={(v) => { setLimitClass(parseInt(v)); setPageClass(1); }}>
                    <SelectTrigger className="h-8 w-[70px] bg-white dark:bg-slate-800 rounded-lg border-slate-200 dark:border-slate-700">
                        <SelectValue placeholder="10" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl bg-white dark:bg-bb-bg">
                        {[10, 25, 50, 100].map(v => (
                            <SelectItem key={v} value={v.toString()}>{v}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <span className="text-sm text-slate-500 dark:text-slate-400 ml-4 hidden sm:inline-block">
                    Showing {(pageClass - 1) * limitClass + 1} to {Math.min(pageClass * limitClass, paginationData.total)} of {paginationData.total} entries
                </span>
            </div>
          <Pagination className="w-auto mx-0">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setPageClass(p => Math.max(1, p - 1))}
                  className={pageClass === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer hover:text-[var(--deep-saffron)]'}
                />
              </PaginationItem>
              <PaginationItem>
                <PaginationLink className="bg-[var(--deep-saffron)]/10 text-[var(--deep-saffron)] border-[var(--deep-saffron)]/30 font-semibold rounded-lg">{pageClass}</PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  onClick={() => setPageClass(p => Math.min(paginationData.totalPages, p + 1))}
                  className={pageClass >= paginationData.totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer hover:text-[var(--deep-saffron)]'}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </div>

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