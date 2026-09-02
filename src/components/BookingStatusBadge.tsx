import type { BookingStatus } from "@prisma/client";

import { Badge } from "./ui";

const LABELS: Record<BookingStatus, { label: string; tone: "neutral" | "brand" | "success" | "warning" | "danger" }> = {
  PENDING: { label: "Awaiting reply", tone: "warning" },
  ACCEPTED: { label: "Confirmed", tone: "success" },
  DECLINED: { label: "Declined", tone: "danger" },
  CANCELLED: { label: "Cancelled", tone: "neutral" },
};

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  const { label, tone } = LABELS[status];
  return <Badge tone={tone}>{label}</Badge>;
}
