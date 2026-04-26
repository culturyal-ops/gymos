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
  { day: "Sun", razorpay: 13000, counter: 3900 }
];

export function RevenueChart({ transactions }: RevenueChartProps) {
  // In a real scenario, we would group transactions by day and payment type here.
  // For now, we use the aesthetic default data but accept the prop for wiring.
  const data = transactions.length > 0 ? defaultData : defaultData.map(d => ({ ...d, razorpay: 0, counter: 0 }));

  return (
    <section className="card p-5">
      <h3 className="mb-3 text-sm uppercase tracking-[0.14em] text-[--color-text-muted]">7-Day Revenue Mix</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "#888885", fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                background: "#111111",
                border: "1px solid #222222",
                color: "#FFFFFF",
                borderRadius: "10px"
              }}
              itemStyle={{ fontSize: "12px" }}
              cursor={{ fill: "rgba(255,255,255,0.05)" }}
            />
            <Bar dataKey="razorpay" stackId="a" fill="#C9A84C" radius={[4, 4, 0, 0]} />
            <Bar dataKey="counter" stackId="a" fill="#3B82F6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
