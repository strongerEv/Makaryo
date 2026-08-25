"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { AXIS_TICK, CHART_COLORS } from "@/components/charts/chart-tokens";

export type AttendancePoint = {
  label: string;
  rate: number;
  onTime: number;
  total: number;
};

/** Persentase kehadiran tepat waktu per hari — satu seri, sumbu tunggal 0–100%. */
export function AttendanceRateChart({ data }: { data: AttendancePoint[] }) {
  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap="28%">
          <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="4 4" vertical={false} />
          <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={false} tickMargin={8} />
          <YAxis
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            width={40}
            domain={[0, 100]}
            tickFormatter={(value) => `${value}%`}
          />
          <Tooltip
            cursor={{ fill: "rgba(91,76,224,.06)" }}
            contentStyle={{
              borderRadius: 14,
              border: "1px solid #E7E9F5",
              boxShadow: "0 12px 32px rgba(30,33,69,.12)",
              fontSize: 12,
              fontWeight: 600,
            }}
            labelStyle={{ color: "#7C7F9E", fontWeight: 600 }}
            formatter={(value, _name, item) => {
              const point = item?.payload as AttendancePoint | undefined;
              return [
                `${Number(value ?? 0)}%${point ? ` (${point.onTime}/${point.total} host)` : ""}`,
                "Tepat waktu",
              ];
            }}
          />
          <Bar dataKey="rate" fill={CHART_COLORS.attendance} radius={[4, 4, 0, 0]} maxBarSize={38} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
