'use client';

import { useState, useEffect } from "react";
import { SectionHeader } from "@/components/admin/shared/SectionHeader";
import { EnhancedCard, EnhancedCardContent } from "@/components/ui/enhanced-card";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EnhancedButton } from "@/components/ui/enhanced-button";
import { Plus, Search, Filter, Users as UsersIcon } from "@/components/ui/icons";
import { LoadingSkeleton } from "@/components/admin/shared/Skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash } from "@/components/ui/icons";
import { useAdminState, User, UserRole, UserStatus } from "@/hooks/use-admin-state";

export default function UserManagementPage() {
  const adminState = useAdminState();
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");
  const [statusFilter, setStatusFilter] = useState<UserStatus | "all">("all");
  const [selectedUsers, setSelectedUsers] = useState<(string | number)[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  
  // Update local state when adminState changes
  useEffect(() => {
    setUsers(adminState.users);
  }, [adminState.users]);
  
  // Filter users based on search, role, and status filters
  const filteredUsers = users.filter((user: User) => {
    // Search filter
    if (searchQuery && 
        !user.name.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !user.email.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    // Role filter
    if (roleFilter !== "all" && user.role !== roleFilter) {
      return false;
    }
    
    // Status filter
    if (statusFilter !== "all" && user.status !== statusFilter) {
      return false;
    }
    
    return true;
  });
  
  const handleSelectAllUsers = (checked: boolean) => {
    if (checked) {
      setSelectedUsers(filteredUsers.map((user: User) => user.id));
    } else {
      setSelectedUsers([]);
    }
  };
  
  const handleSelectUser = (userId: string | number, checked: boolean) => {
    if (checked) {
      setSelectedUsers(prev => [...prev, userId]);
    } else {
      setSelectedUsers(prev => prev.filter(id => id !== userId));
    }
  };

  return (
    <div className="p-6 md:ml-64 space-y-8 animate-vg-fade-in">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-blue-700 to-cyan-600 bg-clip-text text-transparent flex items-center gap-3">
            <UsersIcon className="h-10 w-10 text-blue-700 dark:text-blue-500" />
            User Management
          </h1>
          <p className="text-muted-foreground text-lg">
            Add, edit, or remove users from the system
          </p>
        </div>
        <EnhancedButton
          variant="vg-primary"
          icon={<Plus className="h-4 w-4" />}
          onClick={() => console.log("Add user clicked")}
        >
          Add User
        </EnhancedButton>
      </div>

      <LoadingSkeleton loading={isLoading}>
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  type="search" 
                  placeholder="Search users..." 
                  className="pl-8" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <div className="flex items-center gap-2">
                <Select 
                  value={roleFilter}
                  onValueChange={(value) => setRoleFilter(value as UserRole | "all")}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value= "ADMIN">Admin</SelectItem>
                    <SelectItem value= "LIBRARIAN">Librarian</SelectItem>
                    <SelectItem value= "TEACHER">Teacher</SelectItem>
                    <SelectItem value= "STUDENT">Student</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select
                  value={statusFilter}
                  onValueChange={(value) => setStatusFilter(value as UserStatus | "all")}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                  </SelectContent>
                </Select>
                
                <EnhancedButton
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    setRoleFilter("all");
                    setStatusFilter("all");
                    setSearchQuery("");
                  }}
                >
                  <Filter className="h-4 w-4" />
                </EnhancedButton>
              </div>
            </div>
            
            <div className="rounded-md border overflow-x-auto">
              <Table className="min-w-[800px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox 
                        checked={
                          filteredUsers.length > 0 &&
                          selectedUsers.length === filteredUsers.length
                        }
                        onCheckedChange={handleSelectAllUsers}
                        aria-label="Select all users"
                      />
                    </TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map((user: User) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <Checkbox 
                            checked={selectedUsers.includes(user.id)}
                            onCheckedChange={(checked) => 
                              handleSelectUser(user.id, checked as boolean)
                            }
                            aria-label={`Select ${user.name}`}
                          />
                        </TableCell>
                        <TableCell className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={`/placeholder.svg?height=32&width=32`} alt={user.name} />
                            <AvatarFallback>{user.initials}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{user.name}</div>
                            <div className="text-xs text-muted-foreground">{user.email}</div>
                          </div>
                        </TableCell>
                        <TableCell className="capitalize">{user.role}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div
                              className={`h-2 w-2 rounded-full ${
                                user.status === "ACTIVE" 
                                  ? "bg-green-500" 
                                  : user.status === "PENDING"
                                  ? "bg-yellow-500"
                                  : "bg-gray-300"
                              }`}
                            />
                            <span>{user.status}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <EnhancedButton variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Actions</span>
                              </EnhancedButton>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem>
                                <Pencil className="mr-2 h-4 w-4" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive">
                                <Trash className="mr-2 h-4 w-4" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
                        No users found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            
            {selectedUsers.length > 0 && (
              <div className="flex items-center gap-2 mt-4">
                <span className="text-sm text-muted-foreground">
                  {selectedUsers.length} users selected
                </span>
                <EnhancedButton variant="outline" size="sm">
                  Activate
                </EnhancedButton>
                <EnhancedButton variant="outline" size="sm">
                  Deactivate
                </EnhancedButton>
                <EnhancedButton variant="destructive" size="sm">
                  Delete
                </EnhancedButton>
              </div>
            )}
          </CardContent>
        </Card>
      </LoadingSkeleton>
    </div>
  );
}
