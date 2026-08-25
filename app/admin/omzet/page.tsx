import type { Metadata } from "next";

import { ComingSoon } from "@/components/ui/coming-soon";

export const metadata: Metadata = { title: "Omzet" };

export default function Page() {
  return <ComingSoon title="Omzet" description="Rekap dan tren omzet seluruh host." session="Sesi 7" />;
}
