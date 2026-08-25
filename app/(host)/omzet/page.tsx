import type { Metadata } from "next";

import { ComingSoon } from "@/components/ui/coming-soon";

export const metadata: Metadata = { title: "Omzet" };

export default function Page() {
  return <ComingSoon title="Omzet" description="Input dan riwayat laporan omzet per shift." session="Sesi 7" />;
}
