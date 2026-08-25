import { AppShell } from "@/components/layout/app-shell";
import { ADMIN_NAV } from "@/components/layout/nav";
import { requireAdmin } from "@/lib/auth/session";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireAdmin();

  return (
    <AppShell profile={profile} items={ADMIN_NAV} variant="admin" profileHref="/admin/pengguna">
      {children}
    </AppShell>
  );
}
