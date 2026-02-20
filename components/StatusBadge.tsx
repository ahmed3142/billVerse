type Status = "paid" | "due" | "partial" | string;

export default function StatusBadge({ status }: { status: Status }) {
  const normalized = status?.toLowerCase();

  if (normalized === "paid") {
    return <span className="pill pill-paid">Paid</span>;
  }
  if (normalized === "partial") {
    return <span className="pill pill-partial">Partial</span>;
  }
  return <span className="pill pill-due">Due</span>;
}
