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
      card: 'bg-gradient-to-br from-bb-accent-soft via-bb-accent-soft to-bb-accent-soft dark:from-bb-surface dark:via-bb-surface dark:to-bb-surface border-bb-accent/30 hover:border-bb-accent/50',
      iconBg: 'bg-gradient-to-br from-bb-accent to-bb-accent text-white shadow-lg shadow-bb-accent/30',
      valueColor: 'text-bb-accent dark:text-bb-accent',
    },
    teal: {
      card: 'bg-gradient-to-br from-bb-info-soft via-bb-info-soft to-bb-info-soft dark:from-bb-surface dark:via-bb-surface dark:to-bb-surface border-bb-cobalt/30 hover:border-bb-cobalt/50',
      iconBg: 'bg-gradient-to-br from-bb-cobalt to-bb-cobalt text-white shadow-lg shadow-bb-cobalt/30',
      valueColor: 'text-bb-text dark:text-bb-text',
    },
    gold: {
      card: 'bg-gradient-to-br from-bb-info-soft via-bb-info-soft to-bb-info-soft dark:from-bb-surface dark:via-bb-surface dark:to-bb-surface border-bb-cobalt/30 hover:border-bb-cobalt/50',
      iconBg: 'bg-gradient-to-br from-bb-cobalt to-bb-cobalt text-white shadow-lg shadow-bb-cobalt/30',
      valueColor: 'text-bb-text dark:text-bb-text',
    },
    kumkum: {
      card: 'bg-gradient-to-br from-bb-danger-soft via-bb-danger-soft to-bb-danger-soft dark:from-bb-surface dark:via-bb-surface dark:to-bb-surface border-bb-danger/30 hover:border-bb-danger/50',
      iconBg: 'bg-gradient-to-br from-bb-danger to-bb-danger text-white shadow-lg shadow-bb-danger/30',
      valueColor: 'text-bb-danger-ink dark:text-bb-danger-ink',
    },
    indigo: {
      card: 'bg-gradient-to-br from-bb-info-soft via-bb-info-soft to-bb-info-soft dark:from-bb-bg dark:via-bb-surface dark:to-bb-bg border-bb-cobalt/30 hover:border-bb-cobalt/50',
      iconBg: 'bg-gradient-to-br from-bb-cobalt to-bb-cobalt text-white shadow-lg shadow-bb-cobalt/30',
      valueColor: 'text-bb-text dark:text-bb-text',
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
