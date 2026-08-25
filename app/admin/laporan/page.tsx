import type { Metadata } from "next";

import { ComingSoon } from "@/components/ui/coming-soon";

export const metadata: Metadata = { title: "Laporan" };

export default function Page() {
  return <ComingSoon title="Laporan" description="Export laporan absensi dan omzet ke PDF serta Excel." session="Sesi 7" />;
}
