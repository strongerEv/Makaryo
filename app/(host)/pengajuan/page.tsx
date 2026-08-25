import type { Metadata } from "next";

import { ComingSoon } from "@/components/ui/coming-soon";

export const metadata: Metadata = { title: "Pengajuan" };

export default function Page() {
  return <ComingSoon title="Pengajuan" description="Pengajuan libur mingguan dan izin mendadak." session="Sesi 6" />;
}
