import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, Pencil, Trash } from "@/components/ui/icons"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface UsersListProps {
  limit?: number
}

export function UsersList({ limit }: UsersListProps) {
  const users = [
    {
      id: 1,
      name: "John Smith",
      email: "john.smith@example.com",
      role: "Super Admin",
      institution: "System",
      status: "Active",
      initials: "JS",
    },
    {
      id: 2,
      name: "Sarah Johnson",
      email: "sarah.j@harvard.edu",
      role: "Admin",
      institution: "Harvard University",
      status: "Active",
      initials: "SJ",
    },
    {
      id: 3,
      name: "Michael Chen",
      email: "mchen@stanford.edu",
      role: "Librarian",
      institution: "Stanford Libraries",
      status: "Active",
      initials: "MC",
    },
    {
      id: 4,
      name: "Emily Davis",
      email: "e.davis@mit.edu",
      role: "Teacher",
      institution: "MIT Media Lab",
      status: "Active",
      initials: "ED",
    },
    {
      id: 5,
      name: "Robert Wilson",
      email: "rwilson@oxford.edu",
      role: "Admin",
      institution: "Oxford University Press",
      status: "Active",
      initials: "RW",
    },
    {
      id: 6,
      name: "Lisa Wang",
      email: "lwang@cambridge.edu",
      role: "Librarian",
      institution: "Cambridge Digital Library",
      status: "Inactive",
      initials: "LW",
    },
  ]

  const displayUsers = limit ? users.slice(0, limit) : users

  return (
    <div className="space-y-4">
      {!limit && (
        <div className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground">Showing {users.length} users</div>
          <Button size="sm">Add User</Button>
        </div>
      )}

      <div className="border rounded-md">
        <div className="grid grid-cols-12 gap-4 p-4 border-b font-medium text-sm">
          <div className="col-span-4">User</div>
          <div className="col-span-3">Institution</div>
          <div className="col-span-2">Role</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-1"></div>
        </div>

        {displayUsers.map((user) => (
          <div key={user.id} className="grid grid-cols-12 gap-4 p-4 border-b last:border-0 items-center text-sm">
            <div className="col-span-4 flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={`/placeholder.svg?height=32&width=32`} alt={user.name} />
                <AvatarFallback>{user.initials}</AvatarFallback>
              </Avatar>
              <div>
                <div className="font-medium">{user.name}</div>
                <div className="text-xs text-muted-foreground">{user.email}</div>
              </div>
            </div>
            <div className="col-span-3">{user.institution}</div>
            <div className="col-span-2">{user.role}</div>
            <div className="col-span-2">
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
                  <DropdownMenuItem>
                    <Pencil className="mr-2 h-4 w-4" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive">
                    <Trash className="mr-2 h-4 w-4" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ))}
      </div>

      {limit && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" asChild>
            <a href="/dashboard/super-admin?tab=users">View All</a>
          </Button>
        </div>
      )}
    </div>
  )
}
