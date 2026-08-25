import type { Metadata } from "next";

import { ComingSoon } from "@/components/ui/coming-soon";

export const metadata: Metadata = { title: "Approval" };

export default function Page() {
  return <ComingSoon title="Approval" description="Antrian pengajuan izin mendadak dan libur mingguan." session="Sesi 6" />;
}
