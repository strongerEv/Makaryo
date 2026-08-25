import type { Metadata } from "next";

import { ComingSoon } from "@/components/ui/coming-soon";

export const metadata: Metadata = { title: "Absensi" };

export default function Page() {
  return <ComingSoon title="Absensi" description="Monitor kehadiran seluruh host beserta foto dan lokasinya." session="Sesi 3" />;
}
