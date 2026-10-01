import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Users, Library, Clock } from "@/components/ui/icons";
import { useAdminState, User } from "@/hooks/use-admin-state";
import { useState, useEffect } from "react";

export function QuickStats() {
  const adminState = useAdminState();
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0
  });
  
  useEffect(() => {
    // Count active and inactive users
    const total = adminState.users.length;
    // UserStatus is 'ACTIVE' | 'INACTIVE' | 'PENDING'. These compared against
    // title-case "Active"/"Inactive", so neither ever matched and both tiles
    // rendered 0 regardless of how many users existed.
    const active = adminState.users.filter((user: User) => user.status === "ACTIVE").length;
    const inactive = adminState.users.filter((user: User) => user.status === "INACTIVE").length;
    
    setStats({ total, active, inactive });
  }, [adminState.users]);
  
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total}</div>
          <p className="text-xs text-muted-foreground">
            {stats.active} active, {stats.inactive} inactive
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Books</CardTitle>
          <BookOpen className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">12,345</div>
          <p className="text-xs text-muted-foreground">+234 from last month</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Loans</CardTitle>
          <Library className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">543</div>
          <p className="text-xs text-muted-foreground">+42 from last week</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Overdue Items</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">23</div>
          <p className="text-xs text-muted-foreground">-5 from last week</p>
        </CardContent>
      </Card>
    </div>
  );
} 