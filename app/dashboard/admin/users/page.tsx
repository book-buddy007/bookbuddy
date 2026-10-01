'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Chip } from "@/components/ui/chip";
import { DataTable, type DataColumn } from "@/components/ui/data-table";
import { Icon } from "@/components/ui/icon";
import { PageHeader } from "@/components/ui/page-header";
import { SearchInput } from "@/components/ui/search-input";
import { StatusBadge } from "@/components/ui/status-badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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
import { useAdminState, User, UserRole, UserStatus } from "@/hooks/use-admin-state";

const initialsOf = (name: string) =>
  name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

export default function UserManagementPage() {
  const { users, updateUser, deleteUser } = useAdminState();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");
  const [statusFilter, setStatusFilter] = useState<UserStatus | "all">("all");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [toDelete, setToDelete] = useState<string[] | null>(null);

  const q = searchQuery.toLowerCase();
  const filteredUsers = users.filter((user: User) => {
    if (q && !user.name.toLowerCase().includes(q) && !user.email.toLowerCase().includes(q)) return false;
    if (roleFilter !== "all" && user.role !== roleFilter) return false;
    if (statusFilter !== "all" && user.status !== statusFilter) return false;
    return true;
  });

  const allSelected = filteredUsers.length > 0 && selectedUsers.length === filteredUsers.length;

  const toggleUser = (id: string, checked: boolean) =>
    setSelectedUsers((prev) => (checked ? [...prev, id] : prev.filter((x) => x !== id)));

  const setStatus = (ids: string[], status: UserStatus) => {
    ids.forEach((id) => updateUser(id, { status }));
    setSelectedUsers([]);
  };

  const comingSoon = (what: string) =>
    toast({ title: "Coming soon", description: `${what} isn't available yet.` });

  const columns: DataColumn<User>[] = [
    {
      key: "select",
      header: (
        <Checkbox
          checked={allSelected}
          onCheckedChange={(c) => setSelectedUsers(c ? filteredUsers.map((u: User) => u.id) : [])}
          aria-label="Select all users"
        />
      ),
      cell: (user) => (
        <Checkbox
          checked={selectedUsers.includes(user.id)}
          onCheckedChange={(c) => toggleUser(user.id, c as boolean)}
          aria-label={`Select ${user.name}`}
        />
      ),
      className: "w-12",
    },
    {
      key: "user",
      header: "User",
      cell: (user) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src="" alt={user.name} />
            <AvatarFallback className="bg-bb-navy text-xs font-bold text-white">{user.initials ?? initialsOf(user.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="font-semibold">{user.name}</div>
            <div className="truncate text-xs text-bb-muted">{user.email}</div>
          </div>
        </div>
      ),
    },
    { key: "role", header: "Role", cell: (user) => <Chip>{user.role.charAt(0) + user.role.slice(1).toLowerCase().replace("_", " ")}</Chip> },
    {
      key: "status",
      header: "Status",
      cell: (user) =>
        user.status === "ACTIVE" ? (
          <StatusBadge status="returned" label="Active" />
        ) : user.status === "PENDING" ? (
          <StatusBadge status="pending" />
        ) : (
          <Chip>Inactive</Chip>
        ),
    },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      className: "w-12 text-right",
      cell: (user) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${user.name}`}>
              <Icon name="more-h" size={18} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => comingSoon("Editing users")}>
              <Icon name="edit" size={16} className="mr-2" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem className="text-bb-danger-ink" onClick={() => setToDelete([user.id])}>
              <Icon name="trash" size={16} className="mr-2" /> Delete
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
        eyebrow="Admin"
        title="User management"
        description="Add, edit, or remove users from the system."
        actions={
          <>
            <Chip icon="info">Sample data</Chip>
            <Button onClick={() => comingSoon("Adding users")}>
              <Icon name="plus" size={18} /> Add user
            </Button>
          </>
        }
      />

      <section className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <SearchInput
            wrapperClassName="md:max-w-sm md:flex-1"
            placeholder="Search users"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as UserRole | "all")}>
              <SelectTrigger className="w-36" aria-label="Filter by role"><SelectValue placeholder="Role" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="LIBRARIAN">Librarian</SelectItem>
                <SelectItem value="TEACHER">Teacher</SelectItem>
                <SelectItem value="STUDENT">Student</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as UserStatus | "all")}>
              <SelectTrigger className="w-36" aria-label="Filter by status"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setRoleFilter("all");
                setStatusFilter("all");
                setSearchQuery("");
              }}
            >
              <Icon name="rotate-ccw" size={16} /> Reset
            </Button>
          </div>
        </div>

        {selectedUsers.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-bb-accent-soft px-4 py-2.5">
            <span className="text-sm font-semibold text-bb-accent-ink">{selectedUsers.length} selected</span>
            <Button size="sm" variant="outline" onClick={() => setStatus(selectedUsers, "ACTIVE")}>Activate</Button>
            <Button size="sm" variant="outline" onClick={() => setStatus(selectedUsers, "INACTIVE")}>Deactivate</Button>
            <Button size="sm" variant="destructive" onClick={() => setToDelete(selectedUsers)}>Delete</Button>
          </div>
        )}

        <DataTable
          columns={columns}
          rows={filteredUsers}
          rowKey={(u: User) => u.id}
          emptyIcon="search"
          emptyTitle="No users found"
          emptyDescription="Try a different search or reset the filters."
        />
      </section>

      <AlertDialog open={!!toDelete} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {toDelete?.length === 1 ? "this user" : `${toDelete?.length} users`}?</AlertDialogTitle>
            <AlertDialogDescription>This removes them from the list. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-bb-danger text-white hover:brightness-95"
              onClick={() => {
                toDelete?.forEach((id) => deleteUser(id));
                setSelectedUsers((prev) => prev.filter((id) => !toDelete?.includes(id)));
                setToDelete(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
