"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { StatusBadge } from "@/components/ui/status-badge";
import { StorageBar } from "@/components/super-admin/storage/StorageBar";
import { formatBytes } from "@/utils/storage.utils";
import { notifyInstitution } from "@/lib/api/adminApi";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const panel = "rounded-[22px] bg-bb-surface p-5 shadow-e1 sm:p-6";
const title = "font-display text-lg font-extrabold tracking-[-0.02em]";

// ---------------------------------------------------------------------------
// TierStorageBars
// ---------------------------------------------------------------------------
interface TierEntry {
  tier: string;
  userCount: number;
  usedBytes: number;
  quotaBytes: number;
}

interface TierStorageBarsProps {
  data: TierEntry[];
  className?: string;
}

export function TierStorageBars({ data, className }: TierStorageBarsProps) {
  return (
    <section className={cn(panel, className)}>
      <h3 className={title}>Storage by tier</h3>
      <p className="mb-5 text-[13px] text-bb-muted">Aggregate usage per subscription tier</p>
      {data.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-bb-surface-2">
            <Icon name="class" size={24} />
          </span>
          <p className="text-sm font-semibold">Tier data not yet available</p>
          <p className="max-w-xs text-xs text-bb-muted">
            Tier-level breakdown will appear once quota tracking is enabled per subscription plan.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {data.map((t) => (
            <StorageBar
              key={t.tier}
              label={`${t.tier} (${t.userCount} users)`}
              used={t.usedBytes}
              total={t.quotaBytes}
              showLabels
              size="lg"
            />
          ))}
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// UsersAtRiskTable
// ---------------------------------------------------------------------------
interface UserAtRisk {
  userId: string;
  usedBytes: number;
  riskLevel: "warning" | "critical" | string;
}

interface UsersAtRiskTableProps {
  users: UserAtRisk[];
  alertSummary: {
    atWarning: number;
    atCritical: number;
    atFull: number;
  };
  className?: string;
}

export function UsersAtRiskTable({
  users,
  alertSummary,
  className,
}: UsersAtRiskTableProps) {
  const [notifying, setNotifying] = useState<string | null>(null);

  const handleNotify = async (userId: string, riskLevel: string) => {
    setNotifying(userId);
    try {
      const res = await notifyInstitution(userId, riskLevel);
      if (res.success) {
        if (res.data?.success === false) {
          toast.info(res.data.message ?? "Already notified recently.");
        } else {
          toast.success("Storage alert sent to institution admins.");
        }
      } else {
        toast.error(res.error ?? "Failed to send notification.");
      }
    } catch {
      toast.error("Unexpected error while notifying.");
    } finally {
      setNotifying(null);
    }
  };

  return (
    <section className={cn(panel, className)}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className={title}>Users at risk</h3>
          <p className="text-[13px] text-bb-muted">Personal library usage exceeding 100 MB</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {alertSummary.atWarning > 0 && <StatusBadge status="due-soon" label={`${alertSummary.atWarning} warning`} />}
          {alertSummary.atCritical > 0 && <StatusBadge status="reserved" label={`${alertSummary.atCritical} critical`} />}
          {alertSummary.atFull > 0 && <StatusBadge status="overdue" label={`${alertSummary.atFull} full`} />}
        </div>
      </div>

      {users.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-bb-success-soft">
            <Icon name="check-circle" size={24} />
          </span>
          <p className="text-sm font-semibold">All users within safe limits</p>
          <p className="text-xs text-bb-muted">No user is currently exceeding 100 MB of personal storage.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-bb-border text-left text-xs font-bold uppercase tracking-[0.08em] text-bb-muted">
                <th className="px-2 py-2.5">User ID</th>
                <th className="px-2 py-2.5">Used</th>
                <th className="px-2 py-2.5">Risk</th>
                <th className="px-2 py-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bb-border">
              {users.map((u) => (
                <tr key={u.userId}>
                  <td className="max-w-[180px] truncate px-2 py-2.5 font-mono text-xs text-bb-muted">{u.userId}</td>
                  <td className="px-2 py-2.5 font-semibold tabular-nums">{formatBytes(u.usedBytes)}</td>
                  <td className="px-2 py-2.5">
                    <StatusBadge
                      status={u.riskLevel === "critical" ? "reserved" : "due-soon"}
                      label={u.riskLevel.charAt(0).toUpperCase() + u.riskLevel.slice(1)}
                    />
                  </td>
                  <td className="px-2 py-2.5 text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={notifying === u.userId}
                      onClick={() => handleNotify(u.userId, u.riskLevel)}
                    >
                      {notifying === u.userId ? (
                        <Icon name="loader" size={14} className="animate-spin" />
                      ) : (
                        <Icon name="bell" size={14} />
                      )}
                      Notify
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
