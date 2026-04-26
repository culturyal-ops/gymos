export function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card">
      <div style={{ color: "#64748b", fontSize: 13 }}>{label}</div>
      <div style={{ fontWeight: 700, fontSize: 24, marginTop: 6 }}>{value}</div>
    </div>
  );
}
