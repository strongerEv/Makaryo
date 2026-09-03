import type { Metadata } from "next";
import { Bell } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { ADMIN_NAV, HOST_NAV } from "@/components/layout/nav";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireActiveProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { AppNotification } from "@/lib/types/database";
import { formatDateTime } from "@/lib/utils/datetime";
import { LiveSync } from "@/lib/realtime/live-sync";
import { MarkAllReadButton, NotificationLink } from "./notification-items";

export const metadata: Metadata = { title: "Notifikasi" };

export default async function NotificationsPage() {
  const profile = await requireActiveProfile();
  const supabase = await createClient();

  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(100);

  const notifications = (data ?? []) as AppNotification[];
  const unread = notifications.filter((item) => !item.read_at).length;
  const isAdmin = profile.role === "admin";

  return (
    <AppShell
      profile={profile}
      items={isAdmin ? ADMIN_NAV : HOST_NAV}
      variant={isAdmin ? "admin" : "host"}
      profileHref={isAdmin ? "/admin/pengguna" : "/profil"}
    >
      <LiveSync tables={["notifications"]} />

      <PageHeader
        title="Notifikasi"
        description={unread > 0 ? `${unread} notifikasi belum dibaca.` : "Semua notifikasi sudah dibaca."}
        action={unread > 0 ? <MarkAllReadButton /> : undefined}
      />

      <Card className="p-0">
        {notifications.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="Belum ada notifikasi"
            description="Pengingat shift, hasil approval, dan jadwal baru akan muncul di sini."
          />
        ) : (
          <ul className="divide-y divide-line">
            {notifications.map((item) => (
              <li key={item.id}>
                <NotificationLink notification={item} timestamp={formatDateTime(item.created_at)} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </AppShell>
  );
}
