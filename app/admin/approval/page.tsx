import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeftRight, CheckCircle2, Inbox, Repeat2, UserRoundCheck, XCircle } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/stat-card";
import { requireAdmin } from "@/lib/auth/session";
import { signAvatarUrls } from "@/lib/storage/avatar";
import { createClient } from "@/lib/supabase/server";
import type { AppSettings, LeaveRequest, LeaveStatus, Profile, ShiftSwapRequest } from "@/lib/types/database";
import { LEAVE_STATUS_LABEL, LEAVE_TYPE_LABEL } from "@/lib/types/database";
import { cn } from "@/lib/utils/cn";
import { formatClock, formatDate, formatDateShort } from "@/lib/utils/datetime";
import { UserListItem } from "@/app/admin/pengguna/user-list-item";
import { LiveSync } from "@/lib/realtime/live-sync";
import { ReviewActions } from "./review-actions";
import { SwapReviewActions } from "./swap-review-actions";
import { WeeklyOffWindowForm } from "./weekly-off-window-form";

export const metadata: Metadata = { title: "Approval" };

type Row = LeaveRequest & { profiles: Pick<Profile, "id" | "full_name" | "avatar_url"> | null };

type SwapRow = ShiftSwapRequest & {
  requester: { full_name: string } | null;
  target: { full_name: string } | null;
};

type SwapAssignment = {
  id: string;
  work_date: string;
  shifts: { name: string; start_time: string; end_time: string } | null;
};

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

  const [
    { data: rows },
    { data: settingsRow },
    { data: pendingProfileRows },
    { count: pendingCount },
    { count: approvedCount },
    { count: rejectedCount },
    { data: swapRows },
  ] =
    await Promise.all([
      supabase
        .from("leave_requests")
        .select("*, profiles!leave_requests_host_id_fkey(id, full_name, avatar_url)")
        .eq("status", status)
        .order("requested_date", { ascending: true }),
      supabase.from("app_settings").select("*").eq("id", 1).single(),
      supabase
        .from("profiles")
        .select("*")
        .eq("account_status", "pending")
        .order("created_at", { ascending: true }),
      supabase.from("leave_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("leave_requests").select("id", { count: "exact", head: true }).eq("status", "approved"),
      supabase.from("leave_requests").select("id", { count: "exact", head: true }).eq("status", "rejected"),
      supabase
        .from("shift_swap_requests")
        .select(
          "*, requester:profiles!shift_swap_requests_requester_id_fkey(full_name), target:profiles!shift_swap_requests_target_id_fkey(full_name)",
        )
        .eq("status", "pending")
        .order("created_at", { ascending: true }),
    ]);

  const requests = (rows ?? []) as unknown as Row[];
  const settings = settingsRow as AppSettings | null;
  const pendingProfiles = (pendingProfileRows ?? []) as Profile[];

  const swaps = (swapRows ?? []) as unknown as SwapRow[];

  // Detail penugasan dipetakan sekali supaya kartunya bisa menyebut tanggal
  // dan shift, bukan sekadar id penugasan.
  const swapAssignmentIds = swaps.flatMap((row) => [row.requester_assignment_id, row.target_assignment_id]);
  let swapDetail: Record<string, SwapAssignment> = {};

  if (swapAssignmentIds.length > 0) {
    const { data: detailRows } = await supabase
      .from("schedule_assignments")
      .select("id, work_date, shifts(name, start_time, end_time)")
      .in("id", [...new Set(swapAssignmentIds)]);

    swapDetail = Object.fromEntries(
      ((detailRows ?? []) as unknown as SwapAssignment[]).map((row) => [row.id, row]),
    );
  }

  const ringkasSwap = (id: string) => {
    const row = swapDetail[id];
    if (!row) return "jadwal sudah berubah";
    const jam = row.shifts ? ` ${formatClock(row.shifts.start_time)}–${formatClock(row.shifts.end_time)}` : "";
    return `${formatDateShort(row.work_date)} · ${row.shifts?.name ?? "Shift"}${jam}`;
  };

  const avatars = await signAvatarUrls(supabase, [
    ...requests.map((row) => row.profiles?.avatar_url ?? null),
    ...pendingProfiles.map((profile) => profile.avatar_url),
  ]);

  return (
    <>
      <LiveSync tables={["leave_requests", "shift_swap_requests", "profiles"]} />

      <PageHeader
        title="Approval"
        description="Verifikasi pendaftar baru, serta setujui atau tolak pengajuan izin dan libur."
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard
          label="Pendaftar baru"
          value={pendingProfiles.length}
          icon={UserRoundCheck}
          tone={pendingProfiles.length > 0 ? "primary" : "neutral"}
        />
        <StatCard label="Izin menunggu" value={pendingCount ?? 0} icon={Inbox} tone="amber" />
        <StatCard label="Izin disetujui" value={approvedCount ?? 0} icon={CheckCircle2} tone="emerald" />
        <StatCard label="Izin ditolak" value={rejectedCount ?? 0} icon={XCircle} tone="coral" />
        <StatCard
          label="Tukar shift menunggu"
          value={swaps.length}
          icon={Repeat2}
          tone={swaps.length > 0 ? "amber" : "neutral"}
        />
      </div>

      <Card className="mb-4 p-0">
        <div className="p-5">
          <CardHeader
            className="mb-0"
            title="Tukar shift menunggu persetujuan"
            description="Menyetujui akan langsung menukar jadwal kedua host."
          />
        </div>

        {swaps.length === 0 ? (
          <EmptyState
            icon={Repeat2}
            title="Tidak ada pengajuan tukar shift"
            description="Pengajuan tukar shift dari host akan muncul di sini."
          />
        ) : (
          <ul className="divide-y divide-line">
            {swaps.map((row) => {
              const pengaju = row.requester?.full_name ?? "Host";
              const tujuan = row.target?.full_name ?? "Host";
              const label = `${pengaju} ↔ ${tujuan}`;

              return (
                <li key={row.id} className="px-5 py-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[var(--radius-md)] bg-surface-muted px-3.5 py-3">
                      <p className="text-[11px] font-semibold text-ink-muted">Pengaju</p>
                      <p className="truncate text-[13px] font-bold text-ink">{pengaju}</p>
                      <p className="tabular mt-0.5 text-[12px] text-ink-muted">
                        {ringkasSwap(row.requester_assignment_id)}
                      </p>
                    </div>

                    <div className="rounded-[var(--radius-md)] bg-surface-muted px-3.5 py-3">
                      <p className="flex items-center gap-1 text-[11px] font-semibold text-ink-muted">
                        <ArrowLeftRight className="size-3" aria-hidden />
                        Ditukar dengan
                      </p>
                      <p className="truncate text-[13px] font-bold text-ink">{tujuan}</p>
                      <p className="tabular mt-0.5 text-[12px] text-ink-muted">
                        {ringkasSwap(row.target_assignment_id)}
                      </p>
                    </div>
                  </div>

                  {row.reason ? (
                    <p className="mt-2.5 text-[12px] leading-relaxed text-ink-muted">Alasan: {row.reason}</p>
                  ) : null}

                  <div className="mt-3">
                    <SwapReviewActions requestId={row.id} label={label} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {/*
        Pendaftar baru ditampilkan di sini, bukan hanya di Kelola Pengguna:
        halaman ini yang dicari admin ketika ada anggota baru ingin bergabung.
      */}
      <Card className="mb-4 p-0">
        <div className="p-5">
          <CardHeader
            className="mb-0"
            title="Pendaftar menunggu verifikasi"
            description="Calon host yang mendaftar sendiri. Setujui agar akunnya langsung bisa dipakai."
            action={
              <Link
                href="/admin/pengguna"
                className="text-[13px] font-semibold text-primary hover:underline"
              >
                Kelola pengguna
              </Link>
            }
          />
        </div>

        {pendingProfiles.length === 0 ? (
          <EmptyState
            icon={UserRoundCheck}
            title="Tidak ada pendaftar baru"
            description="Pendaftar yang mengisi halaman daftar akan muncul di sini untuk kamu setujui."
          />
        ) : (
          <ul className="divide-y divide-line">
            {pendingProfiles.map((profile) => (
              <li key={profile.id}>
                <UserListItem
                  user={profile}
                  avatarUrl={profile.avatar_url ? (avatars[profile.avatar_url] ?? null) : null}
                  isSelf={false}
                />
              </li>
            ))}
          </ul>
        )}
      </Card>

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
