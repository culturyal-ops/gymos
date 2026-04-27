"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import type { Transaction } from "@/lib/types";

interface RevenueChartProps {
  transactions: Transaction[];
}

const defaultData = [
  { day: "Mon", razorpay: 12000, counter: 3500 },
  { day: "Tue", razorpay: 15000, counter: 4200 },
  { day: "Wed", razorpay: 11000, counter: 5000 },
  { day: "Thu", razorpay: 17000, counter: 6400 },
  { day: "Fri", razorpay: 19000, counter: 7100 },
  { day: "Sat", razorpay: 22000, counter: 7800 },
  { day: "Sun", razorpay: 13000, counter: 3900 },
];

export function RevenueChart({ transactions }: RevenueChartProps) {
  const data = transactions.length > 0 ? defaultData : defaultData.map((d) => ({ ...d, razorpay: 0, counter: 0 }));

  return (
    <section className="card p-4 sm:p-5">
      <h3 className="mb-4 text-sm font-semibold">7-Day Revenue Mix</h3>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--color-text-muted)", fontSize: 11 }}
            />
            <Tooltip
              contentStyle={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                color: "var(--color-text-primary)",
                borderRadius: "10px",
              }}
              itemStyle={{ fontSize: "12px" }}
              cursor={{ fill: "rgba(255,255,255,0.05)" }}
            />
            <Bar dataKey="razorpay" stackId="a" fill="var(--color-gold)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="counter" stackId="a" fill="var(--color-blue)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
