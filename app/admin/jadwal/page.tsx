import type { Metadata } from "next";

import { ComingSoon } from "@/components/ui/coming-soon";

export const metadata: Metadata = { title: "Jadwal" };

export default function Page() {
  return <ComingSoon title="Jadwal" description="Kalender gabungan seluruh host, penyusunan, dan publish jadwal." session="Sesi 4 dan 5" />;
}
