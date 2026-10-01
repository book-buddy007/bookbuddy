"use client";

import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

export interface CategoryDatum { category: string; count: number; percentage: number }
export interface BorrowerDatum { type: string; count: number; percentage: number }
export interface TrendDatum { week: string; checkouts: number; returns: number }

const trendConfig = {
  checkouts: { label: "Checkouts", color: "hsl(var(--chart-1))" },
  returns: { label: "Returns", color: "hsl(var(--chart-3))" },
} satisfies ChartConfig;

const categoryConfig = {
  count: { label: "Checkouts", color: "hsl(var(--chart-1))" },
} satisfies ChartConfig;

// Navy/cobalt ramp, with the orange highlight reserved for the largest slice.
const SLICE_COLORS = [
  "hsl(var(--chart-2))",
  "hsl(var(--chart-1))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export function CirculationTrendsChart({ data }: { data: TrendDatum[] }) {
  return (
    <ChartContainer config={trendConfig} className="h-[300px] w-full">
      <LineChart data={data} accessibilityLayer>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="week" tickLine={false} axisLine={false} />
        <YAxis tickLine={false} axisLine={false} width={36} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Line dataKey="checkouts" type="monotone" stroke="var(--color-checkouts)" strokeWidth={2.5} dot={{ r: 3 }} />
        <Line dataKey="returns" type="monotone" stroke="var(--color-returns)" strokeWidth={2.5} dot={{ r: 3 }} />
      </LineChart>
    </ChartContainer>
  );
}

export function CategoriesChart({ data }: { data: CategoryDatum[] }) {
  return (
    <ChartContainer config={categoryConfig} className="h-[300px] w-full">
      <BarChart data={data} layout="vertical" accessibilityLayer margin={{ left: 8 }}>
        <CartesianGrid horizontal={false} />
        <YAxis dataKey="category" type="category" tickLine={false} axisLine={false} width={130} />
        <XAxis type="number" hide />
        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
        <Bar dataKey="count" fill="var(--color-count)" radius={[0, 6, 6, 0]} />
      </BarChart>
    </ChartContainer>
  );
}

export function BorrowersChart({ data }: { data: BorrowerDatum[] }) {
  return (
    <div className="flex flex-col items-center gap-4">
      <ChartContainer config={{}} className="h-[220px] w-[220px]">
        <PieChart accessibilityLayer>
          <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="type" />} />
          <Pie data={data} dataKey="count" nameKey="type" innerRadius={55} outerRadius={100} strokeWidth={2}>
            {data.map((_, i) => (
              <Cell key={i} fill={SLICE_COLORS[i % SLICE_COLORS.length]} />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>
      <ul className="w-full space-y-1.5">
        {data.map((d, i) => (
          <li key={d.type} className="flex items-center gap-2 text-sm">
            <span className="h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: SLICE_COLORS[i % SLICE_COLORS.length] }} />
            <span className="min-w-0 flex-1 truncate">{d.type}</span>
            <span className="font-semibold tabular-nums">{d.percentage}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
