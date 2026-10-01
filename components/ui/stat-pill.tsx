import React from "react";
import { cn } from "@/lib/utils";

export type StatPillAccent = 'saffron' | 'teal' | 'gold' | 'kumkum' | 'indigo';

interface StatPillProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  accent: StatPillAccent;
  isLoading?: boolean;
  subLabel?: string;
  className?: string;
  delayMs?: number;
}

export function StatPill({
  label,
  value,
  icon,
  accent,
  isLoading,
  subLabel,
  className,
  delayMs = 0,
}: StatPillProps) {
  const themes: Record<StatPillAccent, { card: string; iconBg: string; valueColor: string }> = {
    saffron: {
      card: 'bg-gradient-to-br from-[#FFF4E6] via-[#FFE8CC] to-[#FFDAB8] dark:from-[#2D1A0A] dark:via-[#3D2212] dark:to-[#1A0F05] border-[#E8A060]/30 hover:border-[#E8A060]/50',
      iconBg: 'bg-gradient-to-br from-[#E8843C] to-[#D4622A] text-white shadow-lg shadow-[#E8843C]/30',
      valueColor: 'text-[#A84A1A] dark:text-[#FFB877]',
    },
    teal: {
      card: 'bg-gradient-to-br from-[#E6FFF9] via-[#CCF5EE] to-[#B8EEDF] dark:from-[#0A2D26] dark:via-[#0F3D33] dark:to-[#051A15] border-[#30B892]/30 hover:border-[#30B892]/50',
      iconBg: 'bg-gradient-to-br from-[#1A9E7A] to-[#0E8367] text-white shadow-lg shadow-[#1A9E7A]/30',
      valueColor: 'text-[#0E6B54] dark:text-[#6EE7C0]',
    },
    gold: {
      card: 'bg-gradient-to-br from-[#F5EDFF] via-[#EBE0FF] to-[#DFD0FF] dark:from-[#1A0F2E] dark:via-[#221640] dark:to-[#130A24] border-[#9063D4]/30 hover:border-[#9063D4]/50',
      iconBg: 'bg-gradient-to-br from-[#8B5CF6] to-[#7040D4] text-white shadow-lg shadow-[#8B5CF6]/30',
      valueColor: 'text-[#6D28D9] dark:text-[#C4A8FF]',
    },
    kumkum: {
      card: 'bg-gradient-to-br from-[#FFF0F0] via-[#FFE4E4] to-[#FFD1D1] dark:from-[#330F0F] dark:via-[#421616] dark:to-[#1C0808] border-[#E85C5C]/30 hover:border-[#E85C5C]/50',
      iconBg: 'bg-gradient-to-br from-[#E84343] to-[#C72E2E] text-white shadow-lg shadow-[#E84343]/30',
      valueColor: 'text-[#9E1B1B] dark:text-[#FF8F8F]',
    },
    indigo: {
      card: 'bg-gradient-to-br from-[#EEF2FF] via-[#E0E7FF] to-[#C7D2FE] dark:from-[#0F172A] dark:via-[#1E293B] dark:to-[#0F172A] border-[#6366F1]/30 hover:border-[#6366F1]/50',
      iconBg: 'bg-gradient-to-br from-[#6366F1] to-[#4F46E5] text-white shadow-lg shadow-[#6366F1]/30',
      valueColor: 'text-[#4338CA] dark:text-[#818CF8]',
    }
  };

  const theme = themes[accent];

  return (
    <div
      className={cn(
        "group flex items-center gap-5 rounded-3xl border",
        theme.card,
        "px-6 py-5 shadow-lg backdrop-blur-md transition-all duration-300",
        "hover:-translate-y-1.5 hover:shadow-xl cursor-default animate-vg-fade-in-up",
        className
      )}
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <div className={cn("shrink-0 flex items-center justify-center w-12 h-12 rounded-2xl transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3", theme.iconBg)}>
        {icon}
      </div>
      <div className="min-w-0">
        {isLoading ? (
          <div className="h-7 w-14 rounded bg-slate-200/50 dark:bg-slate-700/50 animate-pulse" />
        ) : (
          <div className="flex items-baseline gap-2">
            <p className={cn("text-2xl sm:text-3xl font-extrabold leading-none tabular-nums", theme.valueColor)}>
              {value}
            </p>
          </div>
        )}
        <p className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-slate-500/80 dark:text-slate-400 mt-1 truncate">
          {label}
        </p>
        {subLabel && (
          <p className="text-[11px] font-medium text-slate-500/60 dark:text-slate-500 mt-0.5 truncate">
            {subLabel}
          </p>
        )}
      </div>
    </div>
  );
}
