"use client";

import { useEffect, useState } from "react";

interface HealthData {
  summary: {
    queue_pending_count: number;
    dlq_count: number;
    cache_hit_rate_pct: number | null;
    ai_calls_last_hour: number;
    errors_last_hour: number;
  };
  mrr_inr: number;
  dlq: Array<{ id: string; gym_id: string; error: string; retry_count: number; created_at: string }>;
  recent_errors: Array<{ id: string; gym_id: string | null; context: string | null; message: string; created_at: string }>;
  checked_at: string;
}

export default function AdminHealthPage() {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const secret = process.env.NEXT_PUBLIC_INTERNAL_SECRET!;
    fetch("/api/admin/health", {
      headers: { "x-internal-secret": secret },
    })
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, []);

  if (loading) return <div className="p-8 text-[--color-text-secondary]">Loading health data…</div>;
  if (error || !data) return <div className="p-8 text-[--color-red]">Error: {error ?? "No data"}</div>;

  const { summary } = data;

  return (
    <div className="mx-auto max-w-5xl p-8 space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold">System Health</h1>
        <p className="text-xs text-[--color-text-muted] mt-1">
          Last checked: {new Date(data.checked_at).toLocaleString()}
        </p>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label="Queue Pending" value={summary.queue_pending_count} warn={summary.queue_pending_count > 50} />
        <Stat label="Dead Letters" value={summary.dlq_count} warn={summary.dlq_count > 0} />
        <Stat label="Cache Hit %" value={summary.cache_hit_rate_pct != null ? `${summary.cache_hit_rate_pct}%` : "—"} />
        <Stat label="AI Calls / hr" value={summary.ai_calls_last_hour} />
        <Stat label="Errors / hr" value={summary.errors_last_hour} warn={summary.errors_last_hour > 5} />
      </div>

      {/* MRR */}
      <div className="card p-6">
        <p className="text-xs uppercase tracking-widest text-[--color-text-muted]">Monthly Recurring Revenue</p>
        <p className="mt-1 text-3xl font-bold text-[--color-gold]">
          ₹{data.mrr_inr.toLocaleString("en-IN")}
        </p>
      </div>

      {/* DLQ */}
      <section className="card p-6">
        <h2 className="mb-4 text-sm font-medium uppercase tracking-widest text-[--color-text-muted]">
          Dead Letter Queue ({data.dlq.length})
        </h2>
        {data.dlq.length === 0 ? (
          <p className="text-sm text-[--color-green]">All clear ✓</p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-[--color-text-muted]">
                <th className="pb-2 pr-4">Gym</th>
                <th className="pb-2 pr-4">Retries</th>
                <th className="pb-2 pr-4">Error</th>
                <th className="pb-2">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[--color-border]">
              {data.dlq.map((row) => (
                <tr key={row.id}>
                  <td className="py-2 pr-4 font-mono">{row.gym_id.slice(0, 8)}…</td>
                  <td className="py-2 pr-4">{row.retry_count}</td>
                  <td className="py-2 pr-4 text-[--color-red] truncate max-w-xs">{row.error}</td>
                  <td className="py-2 text-[--color-text-muted]">{new Date(row.created_at).toLocaleTimeString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Recent errors */}
      <section className="card p-6">
        <h2 className="mb-4 text-sm font-medium uppercase tracking-widest text-[--color-text-muted]">
          Recent Errors
        </h2>
        {data.recent_errors.length === 0 ? (
          <p className="text-sm text-[--color-green]">No recent errors ✓</p>
        ) : (
          <ul className="space-y-2">
            {data.recent_errors.map((e) => (
              <li key={e.id} className="rounded-[--radius-sm] bg-[--color-surface-2] px-3 py-2 text-xs">
                <span className="text-[--color-text-muted]">{new Date(e.created_at).toLocaleTimeString()}</span>
                {e.context && <span className="ml-2 text-[--color-gold]">[{e.context}]</span>}
                <span className="ml-2 text-[--color-text-primary]">{e.message}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  warn = false,
}: {
  label: string;
  value: string | number;
  warn?: boolean;
}) {
  return (
    <div className="card p-4">
      <p className="text-[10px] uppercase tracking-widest text-[--color-text-muted]">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${warn ? "text-[--color-red]" : "text-[--color-text-primary]"}`}>
        {value}
      </p>
    </div>
  );
}
