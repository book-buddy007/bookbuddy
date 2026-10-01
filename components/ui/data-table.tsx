"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/ui/empty-state"
import type { BBIconName } from "@/components/ui/icon"

export interface DataColumn<T> {
  key: string
  header: React.ReactNode
  cell: (row: T, index: number) => React.ReactNode
  /** Extra classes for both the header and body cells (width, alignment, hide on small screens). */
  className?: string
}

export interface DataTableProps<T> {
  columns: DataColumn<T>[]
  rows: T[]
  rowKey: (row: T, index: number) => string | number
  loading?: boolean
  /** Skeleton rows to show while loading. */
  loadingRows?: number
  onRowClick?: (row: T) => void
  /** Row action(s) rendered in the last column as orange text, e.g. <button>Review</button>. */
  renderActions?: (row: T) => React.ReactNode
  actionsHeader?: React.ReactNode
  emptyTitle?: string
  emptyDescription?: string
  emptyIcon?: BBIconName
  emptyAction?: React.ReactNode
  className?: string
}

/**
 * Standard data table. Header strip on cloud, 12px uppercase labels, 14px rows with 1px
 * dividers and a quiet hover. Always put status in a column rendered with <StatusBadge>.
 * Scrolls horizontally inside its card on narrow screens instead of squashing columns.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading,
  loadingRows = 5,
  onRowClick,
  renderActions,
  actionsHeader = "",
  emptyTitle = "Nothing here yet",
  emptyDescription,
  emptyIcon = "library",
  emptyAction,
  className,
}: DataTableProps<T>) {
  const colCount = columns.length + (renderActions ? 1 : 0)

  if (!loading && rows.length === 0) {
    return <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} action={emptyAction} className={className} />
  }

  return (
    <div className={cn("overflow-hidden rounded-bb-lg bg-bb-surface shadow-e1", className)}>
      <Table className="min-w-[640px]">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {columns.map((c) => (
              <TableHead key={c.key} className={c.className}>
                {c.header}
              </TableHead>
            ))}
            {renderActions && <TableHead className="text-right">{actionsHeader}</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading
            ? Array.from({ length: loadingRows }).map((_, i) => (
                <TableRow key={`s${i}`} className="hover:bg-transparent">
                  {Array.from({ length: colCount }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full max-w-[160px]" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            : rows.map((row, i) => (
                <TableRow
                  key={rowKey(row, i)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(onRowClick && "cursor-pointer")}
                >
                  {columns.map((c) => (
                    <TableCell key={c.key} className={c.className}>
                      {c.cell(row, i)}
                    </TableCell>
                  ))}
                  {renderActions && (
                    <TableCell
                      className="whitespace-nowrap text-right text-sm font-semibold text-bb-accent-ink [&_button]:font-semibold [&_button:hover]:underline [&_a]:font-semibold [&_a:hover]:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {renderActions(row)}
                    </TableCell>
                  )}
                </TableRow>
              ))}
        </TableBody>
      </Table>
    </div>
  )
}
