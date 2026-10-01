import { StatCard } from "@/components/ui/stat-card";
import { useAdminState, User } from "@/hooks/use-admin-state";

// Users come from the in-memory admin state. Books, loans and overdue are sample
// figures: there is no admin overview endpoint yet.
export function QuickStats() {
  const { users } = useAdminState();
  // UserStatus is 'ACTIVE' | 'INACTIVE' | 'PENDING'.
  const active = users.filter((user: User) => user.status === "ACTIVE").length;
  const inactive = users.filter((user: User) => user.status === "INACTIVE").length;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        variant="featured"
        title="Total users"
        value={users.length}
        description={`${active} active, ${inactive} inactive`}
        icon="class"
      />
      <StatCard title="Total books" value="12,345" description="+234 from last month" icon="library" />
      <StatCard title="Active loans" value={543} description="+42 from last week" icon="read" />
      <StatCard title="Overdue items" value={23} description="-5 from last week" icon="overdue" />
    </div>
  );
}
