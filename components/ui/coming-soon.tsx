import { Hammer } from "lucide-react";

import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";

/** Placeholder untuk modul yang dijadwalkan di sesi pengembangan berikutnya. */
export function ComingSoon({
  title,
  description,
  session,
}: {
  title: string;
  description: string;
  session: string;
}) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <Card className="flex flex-col items-center gap-2 py-14 text-center">
        <span className="mb-1 inline-flex size-14 items-center justify-center rounded-full bg-primary-soft text-primary">
          <Hammer className="size-6" aria-hidden />
        </span>
        <p className="text-sm font-semibold text-ink">Modul ini sedang dibangun</p>
        <p className="max-w-sm text-[13px] text-ink-muted">Dikerjakan pada {session}.</p>
      </Card>
    </>
  );
}
