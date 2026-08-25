import type { Metadata } from "next";
import { Search, UserRoundX, Users } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { requireAdmin } from "@/lib/auth/session";
import { signAvatarUrls } from "@/lib/storage/avatar";
import { createClient } from "@/lib/supabase/server";
import type { AccountStatus, Profile } from "@/lib/types/database";
import { CreateUserDialog } from "./create-user-dialog";
import { UserFilterTabs } from "./user-filter-tabs";
import { UserListItem } from "./user-list-item";

export const metadata: Metadata = { title: "Kelola Pengguna" };

type SearchParams = { q?: string; status?: string; role?: string };

const STATUS_FILTERS: Record<string, AccountStatus[]> = {
  pending: ["pending"],
  active: ["active"],
  inactive: ["suspended", "rejected"],
};

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const admin = await requireAdmin();
  const { q = "", status = "all", role = "all" } = await searchParams;
  const supabase = await createClient();

  let query = supabase.from("profiles").select("*").order("created_at", { ascending: false });

  const statuses = STATUS_FILTERS[status];
  if (statuses) query = query.in("account_status", statuses);
  if (role === "host" || role === "admin") query = query.eq("role", role);
  if (q.trim()) query = query.or(`full_name.ilike.%${q.trim()}%,email.ilike.%${q.trim()}%`);

  const [{ data: rows }, { count: totalCount }, { count: pendingCount }, { count: activeHostCount }] =
    await Promise.all([
      query,
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("account_status", "pending"),
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "host")
        .eq("account_status", "active"),
    ]);

  const users = (rows ?? []) as Profile[];
  const avatarMap = await signAvatarUrls(
    supabase,
    users.map((user) => user.avatar_url),
  );

  return (
    <>
      <PageHeader
        title="Kelola Pengguna"
        description="Verifikasi pendaftar, tambah akun baru, dan kelola data karyawan."
        action={<CreateUserDialog />}
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total pengguna" value={totalCount ?? 0} icon={Users} tone="primary" />
        <StatCard
          label="Menunggu verifikasi"
          value={pendingCount ?? 0}
          icon={UserRoundX}
          tone="amber"
          hint={pendingCount ? "Perlu ditindaklanjuti" : "Tidak ada antrian"}
        />
        <StatCard label="Host aktif" value={activeHostCount ?? 0} icon={Users} tone="emerald" />
        <StatCard label="Hasil pencarian" value={users.length} icon={Search} tone="neutral" />
      </div>

      <Card className="p-0">
        <div className="border-b border-line p-4 sm:p-5">
          <UserFilterTabs active={status} pendingCount={pendingCount ?? 0} />

          <form className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px_auto]" action="/admin/pengguna">
            <input type="hidden" name="status" value={status} />
            <Field label="Cari" htmlFor="q" className="sm:col-span-1">
              <Input id="q" name="q" defaultValue={q} placeholder="Nama atau email" />
            </Field>
            <Field label="Peran" htmlFor="role">
              <Select id="role" name="role" defaultValue={role}>
                <option value="all">Semua peran</option>
                <option value="host">Host</option>
                <option value="admin">Admin</option>
              </Select>
            </Field>
            <div className="flex items-end">
              <Button type="submit" variant="outline" block className="sm:w-auto">
                Terapkan
              </Button>
            </div>
          </form>
        </div>

        {users.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Tidak ada pengguna yang cocok"
            description="Coba ubah kata kunci pencarian atau filternya."
          />
        ) : (
          <div>
            <div className="hidden gap-3 border-b border-line px-5 py-3 text-[12px] font-semibold text-ink-muted lg:grid lg:grid-cols-[minmax(0,2.2fr)_1fr_1.1fr_1fr_auto]">
              <span>Nama</span>
              <span>Peran</span>
              <span>Status akun</span>
              <span>Kepegawaian</span>
              <span className="text-right">Aksi</span>
            </div>
            <ul className="divide-y divide-line">
              {users.map((user) => (
                <li key={user.id}>
                  <UserListItem
                    user={user}
                    avatarUrl={user.avatar_url ? (avatarMap[user.avatar_url] ?? null) : null}
                    isSelf={user.id === admin.id}
                  />
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>
    </>
  );
}
