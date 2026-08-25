import type { Metadata } from "next";

import { ComingSoon } from "@/components/ui/coming-soon";

export const metadata: Metadata = { title: "Riwayat Aktivitas" };

export default function Page() {
  return <ComingSoon title="Riwayat Aktivitas" description="Audit log perubahan jadwal, approval, omzet, dan shift." session="Sesi 6" />;
}
