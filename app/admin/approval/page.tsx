import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Inbox, XCircle } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/stat-card";
import { requireAdmin } from "@/lib/auth/session";
import { signAvatarUrls } from "@/lib/storage/avatar";
import { createClient } from "@/lib/supabase/server";
import type { AppSettings, LeaveRequest, LeaveStatus, Profile } from "@/lib/types/database";
import { LEAVE_STATUS_LABEL, LEAVE_TYPE_LABEL } from "@/lib/types/database";
import { cn } from "@/lib/utils/cn";
import { formatDate, formatDateShort } from "@/lib/utils/datetime";
import { ReviewActions } from "./review-actions";
import { WeeklyOffWindowForm } from "./weekly-off-window-form";

export const metadata: Metadata = { title: "Approval" };

type Row = LeaveRequest & { profiles: Pick<Profile, "id" | "full_name" | "avatar_url"> | null };

const TABS: { value: LeaveStatus; label: string }[] = [
  { value: "pending", label: "Menunggu" },
  { value: "approved", label: "Disetujui" },
  { value: "rejected", label: "Ditolak" },
];

export default async function ApprovalPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: LeaveStatus }>;
}) {
  await requireAdmin();
  const { status = "pending" } = await searchParams;
  const supabase = await createClient();

  const [{ data: rows }, { data: settingsRow }, { count: pendingCount }, { count: approvedCount }, { count: rejectedCount }] =
    await Promise.all([
      supabase
        .from("leave_requests")
        .select("*, profiles!leave_requests_host_id_fkey(id, full_name, avatar_url)")
        .eq("status", status)
        .order("requested_date", { ascending: true }),
      supabase.from("app_settings").select("*").eq("id", 1).single(),
      supabase.from("leave_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("leave_requests").select("id", { count: "exact", head: true }).eq("status", "approved"),
      supabase.from("leave_requests").select("id", { count: "exact", head: true }).eq("status", "rejected"),
    ]);

  const requests = (rows ?? []) as unknown as Row[];
  const settings = settingsRow as AppSettings | null;
  const avatars = await signAvatarUrls(
    supabase,
    requests.map((row) => row.profiles?.avatar_url ?? null),
  );

  return (
    <>
      <PageHeader
        title="Approval"
        description="Setujui atau tolak pengajuan izin dan libur dari host."
      />

      <div className="mb-5 grid grid-cols-3 gap-3">
        <StatCard label="Menunggu" value={pendingCount ?? 0} icon={Inbox} tone="amber" />
        <StatCard label="Disetujui" value={approvedCount ?? 0} icon={CheckCircle2} tone="emerald" />
        <StatCard label="Ditolak" value={rejectedCount ?? 0} icon={XCircle} tone="coral" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card className="p-0">
          <div className="border-b border-line p-4 sm:p-5">
            <div className="flex gap-1.5" role="tablist">
              {TABS.map((tab) => (
                <Link
                  key={tab.value}
                  href={`/admin/approval?status=${tab.value}`}
                  role="tab"
                  aria-selected={status === tab.value}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-semibold transition-colors",
                    status === tab.value ? "bg-primary text-white" : "bg-surface-muted text-ink-muted hover:text-ink",
                  )}
                >
                  {tab.label}
                  {tab.value === "pending" && (pendingCount ?? 0) > 0 ? (
                    <span
                      className={cn(
                        "inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-bold",
                        status === tab.value ? "bg-white text-primary" : "bg-amber text-ink",
                      )}
                    >
                      {pendingCount}
                    </span>
                  ) : null}
                </Link>
              ))}
            </div>
          </div>

          {requests.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="Tidak ada pengajuan"
              description={
                status === "pending"
                  ? "Semua pengajuan sudah ditindaklanjuti."
                  : "Belum ada pengajuan pada kategori ini."
              }
            />
          ) : (
            <ul className="divide-y divide-line">
              {requests.map((request) => (
                <li key={request.id} className="px-4 py-4 sm:px-5">
                  <div className="flex flex-wrap items-start gap-3">
                    <Avatar
                      name={request.profiles?.full_name ?? "Host"}
                      src={request.profiles?.avatar_url ? (avatars[request.profiles.avatar_url] ?? null) : null}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">
                        {request.profiles?.full_name ?? "Host"}
                      </p>
                      <p className="text-[12px] text-ink-muted">
                        {LEAVE_TYPE_LABEL[request.type]} · {formatDate(request.requested_date)} · diajukan{" "}
                        {formatDateShort(request.created_at)}
                      </p>
                      {request.reason ? (
                        <p className="mt-1.5 rounded-[12px] bg-surface-muted px-3 py-2 text-[12px] text-ink-muted">
                          {request.reason}
                        </p>
                      ) : null}
                      {request.review_note ? (
                        <p className="mt-1.5 text-[12px] text-ink-muted">Catatan: {request.review_note}</p>
                      ) : null}
                    </div>

                    {request.status === "pending" ? (
                      <ReviewActions requestId={request.id} hostName={request.profiles?.full_name ?? "Host"} />
                    ) : (
                      <Badge tone={request.status === "approved" ? "success" : "danger"}>
                        {LEAVE_STATUS_LABEL[request.status]}
                      </Badge>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="self-start">
          <CardHeader
            title="Periode pengajuan libur"
            description="Buka hanya saat kamu sedang menyusun jadwal bulan berikutnya."
          />
          <WeeklyOffWindowForm settings={settings} />
        </Card>
      </div>
    </>
  );
}
