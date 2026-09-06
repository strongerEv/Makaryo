import type { Metadata } from "next";
import { ArrowLeftRight, Repeat2 } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireHost } from "@/lib/auth/session";
import { earliestSwapDate, SWAP_MIN_LEAD_DAYS } from "@/lib/leave/rules";
import { LiveSync } from "@/lib/realtime/live-sync";
import { createClient } from "@/lib/supabase/server";
import { LEAVE_STATUS_LABEL, type LeaveStatus, type ShiftSwapRequest } from "@/lib/types/database";
import { formatClock, formatDate, formatDateShort, todayInJakarta } from "@/lib/utils/datetime";
import { CancelSwapButton } from "./cancel-swap-button";
import { SwapRequestForm, type SwapOption } from "./swap-request-form";

export const metadata: Metadata = { title: "Tukar Shift" };

const TONE: Record<LeaveStatus, "warning" | "success" | "danger"> = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
};

type AssignmentRow = {
  id: string;
  host_id: string;
  work_date: string;
  shifts: { name: string; start_time: string; end_time: string } | null;
  profiles: { full_name: string } | null;
};

export default async function SwapShiftPage() {
  const profile = await requireHost();
  const supabase = await createClient();

  const today = todayInJakarta();
  const batasAwal = earliestSwapDate(today);

  const [{ data: assignmentRows }, { data: requestRows }] = await Promise.all([
    supabase
      .from("schedule_assignments")
      .select("id, host_id, work_date, shifts(name, start_time, end_time), profiles(full_name)")
      .eq("status", "published")
      .gte("work_date", batasAwal)
      .order("work_date", { ascending: true }),
    supabase
      .from("shift_swap_requests")
      .select("*")
      .or(`requester_id.eq.${profile.id},target_id.eq.${profile.id}`)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const rows = (assignmentRows ?? []) as unknown as AssignmentRow[];

  const toOption = (row: AssignmentRow): SwapOption => {
    const shift = row.shifts;
    const jam = shift ? `${formatClock(shift.start_time)}–${formatClock(shift.end_time)}` : "";
    return {
      assignmentId: row.id,
      hostName: row.profiles?.full_name ?? "Host",
      workDate: row.work_date,
      label: `${formatDateShort(row.work_date)} · ${shift?.name ?? "Shift"} ${jam}`.trim(),
    };
  };

  const mine = rows.filter((row) => row.host_id === profile.id).map(toOption);
  const others = rows.filter((row) => row.host_id !== profile.id).map(toOption);

  const requests = (requestRows ?? []) as ShiftSwapRequest[];

  // Detail penugasan dipetakan sekali supaya daftar riwayat bisa menyebut
  // tanggal dan shiftnya, bukan sekadar id.
  const detailIds = requests.flatMap((item) => [item.requester_assignment_id, item.target_assignment_id]);
  let detail: Record<string, AssignmentRow> = {};

  if (detailIds.length > 0) {
    const { data: detailRows } = await supabase
      .from("schedule_assignments")
      .select("id, host_id, work_date, shifts(name, start_time, end_time), profiles(full_name)")
      .in("id", [...new Set(detailIds)]);

    detail = Object.fromEntries(
      ((detailRows ?? []) as unknown as AssignmentRow[]).map((row) => [row.id, row]),
    );
  }

  const ringkas = (id: string) => {
    const row = detail[id];
    if (!row) return "jadwal sudah berubah";
    return `${row.profiles?.full_name ?? "Host"} · ${formatDateShort(row.work_date)} ${row.shifts?.name ?? ""}`.trim();
  };

  return (
    <>
      <LiveSync tables={["shift_swap_requests", "schedule_assignments"]} />

      <PageHeader
        title="Tukar shift"
        description={`Tukar jadwal dengan host lain. Wajib diajukan minimal H-${SWAP_MIN_LEAD_DAYS}, jadi paling cepat untuk ${formatDate(batasAwal)}.`}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <SwapRequestForm mine={mine} others={others} />

        <Card className="self-start p-0">
          <div className="p-5 pb-0">
            <CardHeader
              className="mb-0"
              title="Riwayat pengajuan"
              description="Termasuk ajakan tukar dari host lain kepadamu."
            />
          </div>

          {requests.length === 0 ? (
            <EmptyState
              icon={Repeat2}
              title="Belum ada pengajuan"
              description="Pengajuan tukar shift yang kamu buat atau kamu terima akan muncul di sini."
            />
          ) : (
            <ul className="mt-4 divide-y divide-line">
              {requests.map((item) => {
                const akuPengaju = item.requester_id === profile.id;

                return (
                  <li key={item.id} className="px-5 py-4">
                    <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[12px] font-semibold text-ink-muted">
                        {akuPengaju ? "Kamu mengajukan" : "Kamu diajak tukar"}
                      </span>
                      <Badge tone={TONE[item.status]}>{LEAVE_STATUS_LABEL[item.status]}</Badge>
                    </div>

                    <p className="flex flex-wrap items-center gap-1.5 text-[13px] font-semibold text-ink">
                      {ringkas(item.requester_assignment_id)}
                      <ArrowLeftRight className="size-3.5 shrink-0 text-ink-muted" aria-hidden />
                      {ringkas(item.target_assignment_id)}
                    </p>

                    {item.reason ? (
                      <p className="mt-1 text-[12px] leading-relaxed text-ink-muted">Alasan: {item.reason}</p>
                    ) : null}
                    {item.review_note ? (
                      <p className="mt-1 text-[12px] leading-relaxed text-ink-muted">
                        Catatan admin: {item.review_note}
                      </p>
                    ) : null}

                    {item.status === "pending" && akuPengaju ? (
                      <div className="mt-2.5">
                        <CancelSwapButton requestId={item.id} />
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
