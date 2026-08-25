import type { Metadata } from "next";

import { ComingSoon } from "@/components/ui/coming-soon";

export const metadata: Metadata = { title: "Jadwal" };

export default function Page() {
  return <ComingSoon title="Jadwal" description="Kalender shift harian, mingguan, dan bulanan." session="Sesi 4" />;
}
