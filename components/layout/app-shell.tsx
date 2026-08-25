import type { ReactNode } from "react";

import { Brand } from "@/components/layout/brand";
import { BottomNav } from "@/components/layout/bottom-nav";
import { MobileDrawer } from "@/components/layout/mobile-drawer";
import type { NavItem } from "@/components/layout/nav";
import { NotificationBell } from "@/components/layout/notification-bell";
import { Sidebar } from "@/components/layout/sidebar";
import { UserMenu } from "@/components/layout/user-menu";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types/database";
import { ROLE_LABEL } from "@/lib/types/database";
import { cn } from "@/lib/utils/cn";

/**
 * Satu kerangka untuk dua kepribadian:
 * - host  → bottom nav melayang di mobile, sidebar di desktop
 * - admin → drawer di mobile, sidebar di desktop
 */
export async function AppShell({
  profile,
  items,
  variant,
  profileHref,
  children,
}: {
  profile: Profile;
  items: NavItem[];
  variant: "host" | "admin";
  profileHref: string;
  children: ReactNode;
}) {
  const supabase = await createClient();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", profile.id)
    .is("read_at", null);

  const unread = count ?? 0;

  const userMenu = (
    <UserMenu
      name={profile.full_name}
      roleLabel={ROLE_LABEL[profile.role]}
      avatarUrl={profile.avatar_url}
      profileHref={profileHref}
    />
  );

  return (
    <div className="min-h-dvh bg-bg">
      <Sidebar
        items={items}
        footer={
          <div className="flex items-center gap-1">
            <div className="min-w-0 flex-1">{userMenu}</div>
            <NotificationBell unread={unread} />
          </div>
        }
      />

      <div className="lg:pl-[260px]">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-line bg-bg/85 px-4 backdrop-blur lg:hidden">
          {variant === "admin" ? <MobileDrawer items={items} /> : null}
          <Brand compact={false} className={cn(variant === "admin" && "ml-1")} />
          <div className="ml-auto flex items-center gap-1">
            <NotificationBell unread={unread} />
            <UserMenu
              name={profile.full_name}
              roleLabel={ROLE_LABEL[profile.role]}
              avatarUrl={profile.avatar_url}
              profileHref={profileHref}
              compact
            />
          </div>
        </header>

        <main
          className={cn(
            "mx-auto w-full max-w-[1280px] px-4 py-5 sm:px-6 lg:px-8 lg:py-8",
            variant === "host" && "pb-28 lg:pb-8",
          )}
        >
          {children}
        </main>
      </div>

      {variant === "host" ? <BottomNav items={items} /> : null}
    </div>
  );
}
