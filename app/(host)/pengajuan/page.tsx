import type { Metadata } from "next";
import { CalendarOff, Inbox } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireHost } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { AppSettings, LeaveRequest } from "@/lib/types/database";
import { LEAVE_STATUS_LABEL, LEAVE_TYPE_LABEL } from "@/lib/types/database";
import { formatDate, formatDateShort, todayInJakarta } from "@/lib/utils/datetime";
import { addDays, monthLabel, monthRange } from "@/lib/utils/period";
import { LeaveRequestForms } from "./leave-request-forms";
import { CancelRequestButton } from "./cancel-request-button";

export const metadata: Metadata = { title: "Pengajuan" };

export default async function LeaveRequestPage() {
  const profile = await requireHost();
  const supabase = await createClient();

  const [{ data: settingsRow }, { data: requestRows }] = await Promise.all([
    supabase.from("app_settings").select("*").eq("id", 1).single(),
    supabase
      .from("leave_requests")
      .select("*")
      .eq("host_id", profile.id)
      .order("requested_date", { ascending: false })
      .limit(50),
  ]);

  const settings = settingsRow as AppSettings | null;
  const requests = (requestRows ?? []) as LeaveRequest[];

  const weeklyOffOpen = Boolean(settings?.weekly_off_request_open);
  const period = settings?.weekly_off_request_period
    ? String(settings.weekly_off_request_period).slice(0, 7)
    : null;
  const periodRange = period ? monthRange(period) : null;

  return (
    <>
      <PageHeader
        title="Pengajuan"
        description="Ajukan jatah libur mingguan dan izin mendadak di sini."
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="space-y-4">
          {weeklyOffOpen ? (
            <Alert tone="info">
              Pengajuan libur mingguan sedang dibuka
              {period ? ` untuk periode ${monthLabel(period)}` : ""}. Ajukan sebelum admin menutupnya.
            </Alert>
          ) : (
            <Alert tone="warning">
              Pengajuan libur mingguan sedang ditutup. Kamu tetap bisa mengajukan izin mendadak.
            </Alert>
          )}

          <LeaveRequestForms
            weeklyOffOpen={weeklyOffOpen}
            weeklyOffMin={periodRange?.start}
            weeklyOffMax={periodRange?.end}
            urgentMin={addDays(todayInJakarta(), 3)}
          />
        </div>

        <Card className="p-0">
          <div className="p-5">
            <CardHeader className="mb-0" title="Riwayat pengajuan" description="Status terbaru dari admin." />
          </div>

          {requests.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="Belum ada pengajuan"
              description="Pengajuan yang kamu kirim akan muncul di sini."
            />
          ) : (
            <ul className="divide-y divide-line">
              {requests.map((request) => (
                <li key={request.id} className="px-5 py-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink">{formatDate(request.requested_date)}</p>
                      <p className="text-[12px] text-ink-muted">
                        {LEAVE_TYPE_LABEL[request.type]} · diajukan {formatDateShort(request.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        tone={
                          request.status === "approved"
                            ? "success"
                            : request.status === "rejected"
                              ? "danger"
                              : "warning"
                        }
                      >
                        {LEAVE_STATUS_LABEL[request.status]}
                      </Badge>
                      {request.status === "pending" ? <CancelRequestButton requestId={request.id} /> : null}
                    </div>
                  </div>

                  {request.reason ? (
                    <p className="mt-1.5 text-[12px] text-ink-muted">Alasan: {request.reason}</p>
                  ) : null}
                  {request.review_note ? (
                    <p className="mt-1.5 rounded-[12px] bg-surface-muted px-3 py-2 text-[12px] text-ink-muted">
                      Catatan admin: {request.review_note}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader title="Aturan pengajuan" />
        <ul className="space-y-2 text-[13px] text-ink-muted">
          <li className="flex gap-2">
            <CalendarOff className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            Libur mingguan hanya bisa diajukan saat admin membuka periodenya, biasanya menjelang penyusunan
            jadwal bulan berikutnya.
          </li>
          <li className="flex gap-2">
            <CalendarOff className="mt-0.5 size-4 shrink-0 text-coral" aria-hidden />
            Izin mendadak wajib diajukan minimal H-3 sebelum tanggal izin dan harus menyertakan alasan.
          </li>
        </ul>
      </Card>
    </>
  );
}
