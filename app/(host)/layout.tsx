import { AppShell } from "@/components/layout/app-shell";
import { HOST_NAV } from "@/components/layout/nav";
import { requireHost } from "@/lib/auth/session";

export default async function HostLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireHost();

  return (
    <AppShell profile={profile} items={HOST_NAV} variant="host" profileHref="/profil">
      {children}
    </AppShell>
  );
}
