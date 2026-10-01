"use client";
import { useState } from "react";
import { EnhancedCard, EnhancedCardContent, EnhancedCardHeader, EnhancedCardTitle, EnhancedCardDescription } from "@/components/ui/enhanced-card";
import { Button } from "@/components/ui/button";
import { StorageBar } from "@/components/super-admin/storage/StorageBar";
import { formatBytes } from "@/utils/storage.utils";
import { notifyInstitution } from "@/lib/api/adminApi";
import { Bell, Loader2, AlertTriangle, ShieldAlert, Users } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const cardClass = "border-slate-200/60 dark:border-slate-700/40 bg-white/70 dark:bg-[#0A0F1E]/70 backdrop-blur-md relative overflow-hidden shadow-sm";
const headerClass = "relative z-10 border-b border-slate-100 dark:border-slate-700/40";

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
    <EnhancedCard className={cn(cardClass, className)}>
      <EnhancedCardHeader className={headerClass}>
        <EnhancedCardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
          <div className="h-2 w-2 rounded-full bg-[var(--peacock-teal)] animate-pulse" />
          Storage by Tier
        </EnhancedCardTitle>
        <EnhancedCardDescription className="text-slate-500 dark:text-white/50">
          Aggregate usage per subscription tier
        </EnhancedCardDescription>
      </EnhancedCardHeader>
      <EnhancedCardContent className="relative z-10 pt-4">
        {data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-[#1A9E7A] to-[#0E8367] text-white shadow-lg shadow-[#1A9E7A]/30">
              <Users className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Tier data not yet available
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 max-w-xs">
              Tier-level breakdown will appear once quota tracking is enabled
              per subscription plan.
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
      </EnhancedCardContent>
    </EnhancedCard>
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

  const badgeFor = (level: string) =>
    level === "critical"
      ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
      : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-500";

  const iconFor = (level: string) =>
    level === "critical" ? (
      <ShieldAlert className="h-3.5 w-3.5" />
    ) : (
      <AlertTriangle className="h-3.5 w-3.5" />
    );

  return (
    <EnhancedCard className={cn(cardClass, className)}>
      <EnhancedCardHeader className={headerClass}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <EnhancedCardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
              <div className="h-2 w-2 rounded-full bg-[var(--deep-saffron)] animate-pulse" />
              Users At Risk
            </EnhancedCardTitle>
            <EnhancedCardDescription className="text-slate-500 dark:text-white/50">
              Personal library usage exceeding 100 MB
            </EnhancedCardDescription>
          </div>
          {/* Alert summary pills */}
          <div className="flex gap-2 flex-wrap">
            {alertSummary.atWarning > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                <AlertTriangle className="h-3 w-3" />
                {alertSummary.atWarning} warning
              </span>
            )}
            {alertSummary.atCritical > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                <ShieldAlert className="h-3 w-3" />
                {alertSummary.atCritical} critical
              </span>
            )}
            {alertSummary.atFull > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                <ShieldAlert className="h-3 w-3" />
                {alertSummary.atFull} full
              </span>
            )}
          </div>
        </div>
      </EnhancedCardHeader>
      <EnhancedCardContent className="relative z-10 pt-4">
        {users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-lg shadow-emerald-500/30">
              <Users className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              All users within safe limits
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              No user is currently exceeding 100 MB of personal storage.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <th className="text-left py-2.5 px-2 font-semibold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    User ID
                  </th>
                  <th className="text-left py-2.5 px-2 font-semibold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    Used
                  </th>
                  <th className="text-left py-2.5 px-2 font-semibold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    Risk
                  </th>
                  <th className="text-right py-2.5 px-2 font-semibold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                {users.map((u) => (
                  <tr
                    key={u.userId}
                    className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="py-2.5 px-2 font-mono text-xs text-slate-600 dark:text-slate-400 truncate max-w-[180px]">
                      {u.userId}
                    </td>
                    <td className="py-2.5 px-2 tabular-nums font-medium text-slate-800 dark:text-slate-200">
                      {formatBytes(u.usedBytes)}
                    </td>
                    <td className="py-2.5 px-2">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold capitalize",
                          badgeFor(u.riskLevel)
                        )}
                      >
                        {iconFor(u.riskLevel)}
                        {u.riskLevel}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 gap-1.5 text-xs text-slate-600 dark:text-slate-300 hover:text-[var(--deep-saffron)]"
                        disabled={notifying === u.userId}
                        onClick={() => handleNotify(u.userId, u.riskLevel)}
                      >
                        {notifying === u.userId ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Bell className="h-3 w-3" />
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
      </EnhancedCardContent>
    </EnhancedCard>
  );
}
