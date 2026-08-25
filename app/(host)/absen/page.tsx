import type { Metadata } from "next";

import { ComingSoon } from "@/components/ui/coming-soon";

export const metadata: Metadata = { title: "Absen" };

export default function Page() {
  return <ComingSoon title="Absen" description="Clock in dan clock out dengan foto serta lokasi." session="Sesi 3" />;
}
