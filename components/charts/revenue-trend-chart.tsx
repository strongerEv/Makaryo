"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AXIS_TICK, CHART_COLORS } from "@/components/charts/chart-tokens";
import { formatCurrency } from "@/lib/utils/format";

export type RevenuePoint = { label: string; amount: number };

function compactRupiah(value: number) {
  if (value >= 1_000_000) return `${Math.round(value / 100_000) / 10} jt`;
  if (value >= 1_000) return `${Math.round(value / 1_000)} rb`;
  return String(value);
}

/** Tren omzet — satu seri, jadi judul kartu sudah menamainya dan legenda tidak diperlukan. */
export function RevenueTrendChart({ data }: { data: RevenuePoint[] }) {
  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART_COLORS.revenue} stopOpacity={0.22} />
              <stop offset="100%" stopColor={CHART_COLORS.revenue} stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="4 4" vertical={false} />
          <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={false} tickMargin={8} />
          <YAxis
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            width={52}
            tickFormatter={compactRupiah}
          />
          <Tooltip
            cursor={{ stroke: CHART_COLORS.revenue, strokeWidth: 1, strokeDasharray: "4 4" }}
            contentStyle={{
              borderRadius: 14,
              border: "1px solid #E7E9F5",
              boxShadow: "0 12px 32px rgba(30,33,69,.12)",
              fontSize: 12,
              fontWeight: 600,
            }}
            labelStyle={{ color: "#7C7F9E", fontWeight: 600 }}
            formatter={(value) => [formatCurrency(Number(value ?? 0)), "Omzet"]}
          />
          <Area
            type="monotone"
            dataKey="amount"
            stroke={CHART_COLORS.revenue}
            strokeWidth={2}
            fill="url(#revenueFill)"
            dot={{ r: 3, strokeWidth: 2, fill: "#fff", stroke: CHART_COLORS.revenue }}
            activeDot={{ r: 5, strokeWidth: 2, fill: "#fff", stroke: CHART_COLORS.revenue }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
