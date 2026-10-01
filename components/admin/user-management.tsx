"use client"

import { useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MoreHorizontal, Pencil, Search, Trash } from "@/components/ui/icons"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { UserDialog } from "./user-dialog"
import { toast } from "@/hooks/use-toast"

type User = {
  id: number
  name: string
  email: string
  role: "ADMIN" | "teacher" | "student"
  status: "Active" | "Inactive"
  initials: string
}

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([
    {
      id: 1,
      name: "Sarah Johnson",
      email: "sarah.j@example.edu",
      role: "ADMIN",
      status: "Active",
      initials: "SJ",
    },
    {
      id: 2,
      name: "Michael Chen",
      email: "mchen@example.edu",
      role: "TEACHER",
      status: "Active",
      initials: "MC",
    },
    {
      id: 3,
      name: "Emily Davis",
      email: "e.davis@example.edu",
      role: "STUDENT",
      status: "Active",
      initials: "ED",
    },
    {
      id: 4,
      name: "Robert Wilson",
      email: "rwilson@example.edu",
      role: "TEACHER",
      status: "Active",
      initials: "RW",
    },
    {
      id: 5,
      name: "Lisa Wang",
      email: "lwang@example.edu",
      role: "STUDENT",
      status: "Inactive",
      initials: "LW",
    },
  ])

  const [searchQuery, setSearchQuery] = useState("")
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState<User | null>(null)

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleCreateUser = (values: { name: string; email: string; role: "ADMIN" | "teacher" | "student" }) => {
    const newUser = {
      id: users.length + 1,
      name: values.name,
      email: values.email,
      role: values.role,
      status: "Active" as const,
      initials: values.name.split(" ").map(n => n[0]).join("").toUpperCase(),
    }
    setUsers([...users, newUser])
    toast({
      title: "User created",
      description: `${values.name} has been added successfully.`,
    })
  }

  const handleEditUser = (values: { name: string; email: string; role: "ADMIN" | "teacher" | "student" }) => {
    if (!currentUser) return
    
    const updatedUsers = users.map(user => {
      if (user.id === currentUser.id) {
        return {
          ...user,
          name: values.name,
          email: values.email,
          role: values.role,
          initials: values.name.split(" ").map(n => n[0]).join("").toUpperCase(),
        }
      }
      return user
    })
    
    setUsers(updatedUsers)
    toast({
      title: "User updated",
      description: `${values.name} has been updated successfully.`,
    })
  }

  const handleDeleteUser = (userId: number) => {
    setUsers(users.filter(user => user.id !== userId))
    toast({
      title: "User deleted",
      description: "The user has been deleted successfully.",
      variant: "destructive",
    })
  }

  const openEditDialog = (user: User) => {
    setCurrentUser(user)
    setEditDialogOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative w-64">
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
          <Button onClick={() => setCreateDialogOpen(true)}>Add User</Button>
        </div>
      </div>

      <div className="border rounded-md">
        <div className="grid grid-cols-12 gap-4 p-4 border-b font-medium text-sm">
          <div className="col-span-5">User</div>
          <div className="col-span-3">Role</div>
          <div className="col-span-3">Status</div>
          <div className="col-span-1"></div>
        </div>

        {filteredUsers.length > 0 ? (
          filteredUsers.map((user) => (
          <div key={user.id} className="grid grid-cols-12 gap-4 p-4 border-b last:border-0 items-center text-sm">
            <div className="col-span-5 flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={`/placeholder.svg?height=32&width=32`} alt={user.name} />
                <AvatarFallback>{user.initials}</AvatarFallback>
              </Avatar>
              <div>
                <div className="font-medium">{user.name}</div>
                <div className="text-xs text-muted-foreground">{user.email}</div>
              </div>
            </div>
              <div className="col-span-3 capitalize">{user.role}</div>
            <div className="col-span-3">
              <div className="flex items-center gap-2">
                <div
                  className={`h-2 w-2 rounded-full ${user.status === "Active" ? "bg-green-500" : "bg-gray-300"}`}
                ></div>
                <span>{user.status}</span>
              </div>
            </div>
            <div className="col-span-1 flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">Actions</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => openEditDialog(user)}>
                    <Pencil className="mr-2 h-4 w-4" /> Edit
                  </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="text-destructive"
                      onClick={() => handleDeleteUser(user.id)}
                    >
                    <Trash className="mr-2 h-4 w-4" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          ))
        ) : (
          <div className="p-4 text-center text-muted-foreground">No users found</div>
        )}
      </div>

      <UserDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={handleCreateUser}
        mode="create"
      />

      {currentUser && (
        <UserDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onSubmit={handleEditUser}
          mode="edit"
          defaultValues={{
            name: currentUser.name,
            email: currentUser.email,
            role: currentUser.role,
          }}
        />
      )}
    </div>
  )
}
