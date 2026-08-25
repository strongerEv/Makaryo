import { Badge, type Tone } from "@/components/ui/badge";
import type { AttendanceStatus } from "@/lib/types/database";
import { ATTENDANCE_STATUS_LABEL } from "@/lib/types/database";

const TONE: Record<AttendanceStatus, Tone> = {
  on_time: "success",
  late: "warning",
  absent: "danger",
};

export function AttendanceStatusBadge({
  status,
  lateMinutes,
}: {
  status: AttendanceStatus;
  lateMinutes?: number;
}) {
  return (
    <Badge tone={TONE[status]}>
      {ATTENDANCE_STATUS_LABEL[status]}
      {status === "late" && lateMinutes ? ` ${lateMinutes} mnt` : ""}
    </Badge>
  );
}
