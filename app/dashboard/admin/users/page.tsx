'use client';

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Chip } from "@/components/ui/chip";
import { DataTable, type DataColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { PageHeader } from "@/components/ui/page-header";
import { SearchInput } from "@/components/ui/search-input";
import { StatusBadge } from "@/components/ui/status-badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";
import { useAuthStore } from "@/store/useAuthStore";
import { useAdminTenant } from "@/hooks/use-admin-tenant";
import {
  TENANT_ROLES,
  fetchTenantUsers,
  removeTenantUser,
  setTenantUserRole,
  setTenantUserStatus,
  type MembershipStatus,
  type TenantRole,
  type TenantUser,
  type TenantUserList,
} from "@/lib/tenant-users";

const PAGE_SIZE = 20;

const initialsOf = (name: string) =>
  name.split(" ").filter(Boolean).map((n) => n[0]).join("").slice(0, 2).toUpperCase();

const roleLabel = (role: string) => role.charAt(0) + role.slice(1).toLowerCase();

const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "Never";

export default function UserManagementPage() {
  const { user: me } = useAuthStore();
  const { tenantId: currentTenantId, loading: tenantLoading } = useAdminTenant();
  const { toast } = useToast();

  const [list, setList] = useState<TenantUserList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<TenantRole | "all">("all");
  const [statusFilter, setStatusFilter] = useState<MembershipStatus | "all">("all");
  const [page, setPage] = useState(1);

  const [selected, setSelected] = useState<string[]>([]);
  const [toRemove, setToRemove] = useState<TenantUser[] | null>(null);
  const [busy, setBusy] = useState(false);

  // Debounce the search box so each keystroke isn't a request.
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (!currentTenantId) return;
      setLoading(true);
      try {
        const result = await fetchTenantUsers(
          currentTenantId,
          { page, limit: PAGE_SIZE, search, role: roleFilter, status: statusFilter },
          signal,
        );
        setList(result);
        setError(null);
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        setError(err?.message || "Couldn't load users");
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [currentTenantId, page, search, roleFilter, statusFilter],
  );

  // Only the latest request may write state: a slow earlier response must not overwrite a newer one.
  const latest = useRef<AbortController | null>(null);
  useEffect(() => {
    latest.current?.abort();
    const controller = new AbortController();
    latest.current = controller;
    setSelected([]);
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const rows = list?.data ?? [];
  const pagination = list?.pagination;

  // The signed-in admin and platform super-admins are not changeable from here (the backend enforces it too).
  const isLocked = (u: TenantUser) => u.id === me?.id || u.isPlatformSuperAdmin;
  const selectableRows = rows.filter((u) => !isLocked(u));
  const allSelected = selectableRows.length > 0 && selected.length === selectableRows.length;

  const toggle = (id: string, checked: boolean) =>
    setSelected((prev) => (checked ? [...prev, id] : prev.filter((x) => x !== id)));

  /** Runs one change per user and reports partial failure instead of hiding it. */
  const applyToMany = async (
    users: TenantUser[],
    action: (u: TenantUser) => Promise<unknown>,
    verb: string,
  ) => {
    if (!currentTenantId || users.length === 0) return;
    setBusy(true);
    const results = await Promise.allSettled(users.map(action));
    const failed = results.flatMap((r, i) => (r.status === "rejected" ? [{ user: users[i], reason: r.reason }] : []));
    const ok = users.length - failed.length;

    if (failed.length === 0) {
      toast({ title: `${verb}`, description: ok === 1 ? users[0].name : `${ok} users` });
    } else {
      toast({
        title: ok > 0 ? `${verb} ${ok} of ${users.length}` : `Couldn't complete that`,
        description: `${failed[0].user.name}: ${failed[0].reason?.message ?? "request failed"}`,
        variant: "destructive",
      });
    }
    setSelected([]);
    setBusy(false);
    await load();
  };

  const setStatus = (users: TenantUser[], status: "ACTIVE" | "SUSPENDED") =>
    applyToMany(
      users.filter((u) => u.status !== status),
      (u) => setTenantUserStatus(currentTenantId!, u.id, status),
      status === "ACTIVE" ? "Reactivated" : "Suspended",
    );

  const changeRole = (u: TenantUser, role: TenantRole) =>
    role === u.role
      ? undefined
      : applyToMany([u], (x) => setTenantUserRole(currentTenantId!, x.id, role), `Role set to ${roleLabel(role).toLowerCase()}`);

  const confirmRemove = async () => {
    const users = toRemove;
    setToRemove(null);
    if (users) await applyToMany(users, (u) => removeTenantUser(currentTenantId!, u.id), "Removed");
  };

  const resetFilters = () => {
    setSearchInput("");
    setSearch("");
    setRoleFilter("all");
    setStatusFilter("all");
    setPage(1);
  };

  const columns: DataColumn<TenantUser>[] = [
    {
      key: "select",
      header: (
        <Checkbox
          checked={allSelected}
          disabled={selectableRows.length === 0}
          onCheckedChange={(c) => setSelected(c ? selectableRows.map((u) => u.id) : [])}
          aria-label="Select all users on this page"
        />
      ),
      cell: (u) => (
        <Checkbox
          checked={selected.includes(u.id)}
          disabled={isLocked(u)}
          onCheckedChange={(c) => toggle(u.id, c as boolean)}
          aria-label={`Select ${u.name}`}
        />
      ),
      className: "w-12",
    },
    {
      key: "user",
      header: "User",
      cell: (u) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src={u.image ?? ""} alt={u.name} />
            <AvatarFallback className="bg-bb-navy text-xs font-bold text-white">{initialsOf(u.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="font-semibold">
              {u.name}
              {u.id === me?.id && <span className="ml-2 text-xs font-medium text-bb-muted">(you)</span>}
            </div>
            <div className="truncate text-xs text-bb-muted">{u.email}</div>
          </div>
        </div>
      ),
    },
    { key: "role", header: "Role", cell: (u) => <Chip>{roleLabel(u.role)}</Chip> },
    {
      key: "status",
      header: "Status",
      cell: (u) =>
        u.status === "ACTIVE" ? (
          <StatusBadge status="returned" label={u.accountActive ? "Active" : "Account disabled"} />
        ) : u.status === "PENDING" ? (
          <StatusBadge status="pending" />
        ) : (
          <Chip>Suspended</Chip>
        ),
    },
    { key: "joined", header: "Joined", cell: (u) => <span className="text-sm text-bb-muted">{formatDate(u.joinedAt)}</span>, className: "hidden md:table-cell" },
    { key: "lastLogin", header: "Last sign-in", cell: (u) => <span className="text-sm text-bb-muted">{formatDate(u.lastLoginAt)}</span>, className: "hidden lg:table-cell" },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      className: "w-12 text-right",
      cell: (u) =>
        isLocked(u) ? null : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${u.name}`} disabled={busy}>
                <Icon name="more-h" size={18} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Change role</DropdownMenuLabel>
              {TENANT_ROLES.map((r) => (
                <DropdownMenuItem key={r} onClick={() => changeRole(u, r)} disabled={r === u.role}>
                  <Icon name={r === u.role ? "check" : "user"} size={16} className="mr-2" /> {roleLabel(r)}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              {u.status === "SUSPENDED" ? (
                <DropdownMenuItem onClick={() => setStatus([u], "ACTIVE")}>
                  <Icon name="user-check" size={16} className="mr-2" /> Reactivate
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => setStatus([u], "SUSPENDED")}>
                  <Icon name="pause" size={16} className="mr-2" /> Suspend
                </DropdownMenuItem>
              )}
              <DropdownMenuItem className="text-bb-danger-ink" onClick={() => setToRemove([u])}>
                <Icon name="trash" size={16} className="mr-2" /> Remove from institution
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
    },
  ];

  const header = (
    <PageHeader
      className="mb-0"
      eyebrow="Admin"
      title="User management"
      description="Manage who belongs to your institution and what they can do."
      actions={
        <Button asChild>
          <Link href="/dashboard/admin/join-requests">
            <Icon name="user-plus" size={18} /> Review join requests
          </Link>
        </Button>
      }
    />
  );

  if (tenantLoading) {
    return (
      <div className="space-y-8">
        {header}
        <DataTable columns={columns} rows={[]} rowKey={(u: TenantUser) => u.id} loading />
      </div>
    );
  }

  if (!currentTenantId) {
    return (
      <div className="space-y-8">
        {header}
        <EmptyState
          icon="institution"
          title="No institution selected"
          description="Your account isn't linked to an institution yet. Platform administrators manage everyone from Super admin → Users."
        />
      </div>
    );
  }

  const summary = list?.summary;
  const filtersActive = !!search || roleFilter !== "all" || statusFilter !== "all";

  return (
    <div className="space-y-8">
      {header}

      <section className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <SearchInput
            wrapperClassName="md:max-w-sm md:flex-1"
            placeholder="Search by name or email"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v as TenantRole | "all"); setPage(1); }}>
              <SelectTrigger className="w-36" aria-label="Filter by role"><SelectValue placeholder="Role" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                {TENANT_ROLES.map((r) => <SelectItem key={r} value={r}>{roleLabel(r)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as MembershipStatus | "all"); setPage(1); }}>
              <SelectTrigger className="w-36" aria-label="Filter by status"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="SUSPENDED">Suspended</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={resetFilters} disabled={!filtersActive}>
              <Icon name="rotate-ccw" size={16} /> Reset
            </Button>
          </div>
        </div>

        {summary && (
          <p className="text-sm text-bb-muted" aria-live="polite">
            {summary.total} members: {summary.active} active
            {summary.suspended > 0 && `, ${summary.suspended} suspended`}
            {summary.pending > 0 && `, ${summary.pending} pending`}
          </p>
        )}

        {selected.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-bb-accent-soft px-4 py-2.5">
            <span className="text-sm font-semibold text-bb-accent-ink">{selected.length} selected</span>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => setStatus(rows.filter((u) => selected.includes(u.id)), "ACTIVE")}>Reactivate</Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => setStatus(rows.filter((u) => selected.includes(u.id)), "SUSPENDED")}>Suspend</Button>
            <Button size="sm" variant="destructive" disabled={busy} onClick={() => setToRemove(rows.filter((u) => selected.includes(u.id)))}>Remove</Button>
          </div>
        )}

        {error ? (
          <EmptyState
            icon="alert-circle"
            title="Couldn't load users"
            description={error}
            action={<Button variant="outline" onClick={() => load()}>Try again</Button>}
          />
        ) : (
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(u: TenantUser) => u.id}
            loading={loading && !list}
            emptyIcon="search"
            emptyTitle={filtersActive ? "No users match" : "No members yet"}
            emptyDescription={filtersActive ? "Try a different search or reset the filters." : "Approve join requests to add people to your institution."}
          />
        )}

        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-bb-muted">
              Page {pagination.page} of {pagination.totalPages}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={loading || page <= 1} onClick={() => setPage((p) => p - 1)}>
                <Icon name="chevron-left" size={16} /> Previous
              </Button>
              <Button variant="outline" size="sm" disabled={loading || page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}>
                Next <Icon name="chevron-right" size={16} />
              </Button>
            </div>
          </div>
        )}
      </section>

      <AlertDialog open={!!toRemove} onOpenChange={(open) => !open && setToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Remove {toRemove?.length === 1 ? toRemove[0].name : `${toRemove?.length} users`} from your institution?
            </AlertDialogTitle>
            <AlertDialogDescription>
              They lose access to your institution&apos;s library. Their account stays, and they can ask to join again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-bb-danger text-white hover:brightness-95" onClick={confirmRemove}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
