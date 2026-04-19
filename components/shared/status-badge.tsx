import { AlertTriangle, CheckCircle2, Clock3 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { PaymentStatus } from "@/types/domain";

export const statusMap: Record<
  PaymentStatus,
  { icon: React.ComponentType<{ className?: string }>; className: string; label: string }
> = {
  paid: {
    icon: CheckCircle2,
    className: "status-paid",
    label: "Paid",
  },
  partial: {
    icon: Clock3,
    className: "status-partial",
    label: "Partial",
  },
  pending: {
    icon: AlertTriangle,
    className: "status-pending",
    label: "Pending",
  },
};

export function StatusBadge({ status }: { status: PaymentStatus }) {
  const config = statusMap[status];
  const Icon = config.icon;

  return (
    <Badge className={config.className}>
      <Icon className="mr-1 h-3.5 w-3.5" />
      {config.label}
    </Badge>
  );
}
