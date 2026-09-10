import { Badge } from "./ui";
import { STATUS_CLASS, STATUS_LABEL } from "@/lib/format";
import type { BookingStatus } from "@/lib/types";

export function StatusBadge({ status }: { status: BookingStatus }) {
  return <Badge className={STATUS_CLASS[status] ?? STATUS_CLASS.confirmed}>{STATUS_LABEL[status] ?? status}</Badge>;
}
