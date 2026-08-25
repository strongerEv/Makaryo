import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { monthLabel } from "@/lib/utils/period";

function shiftMonth(month: string, delta: number) {
  const [year, monthPart] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthPart - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Navigasi bulan sebelumnya / berikutnya sebagai tautan biasa. */
export function MonthNav({
  month,
  basePath,
  extraParams,
}: {
  month: string;
  basePath: string;
  extraParams?: Record<string, string | undefined>;
}) {
  const buildHref = (target: string) => {
    const params = new URLSearchParams({ bulan: target });
    Object.entries(extraParams ?? {}).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    return `${basePath}?${params.toString()}`;
  };

  return (
    <div className="flex items-center gap-2">
      <Link
        href={buildHref(shiftMonth(month, -1))}
        aria-label="Bulan sebelumnya"
        className="inline-flex size-9 items-center justify-center rounded-full border border-line bg-surface text-ink-muted transition-colors hover:text-ink"
      >
        <ChevronLeft className="size-4" aria-hidden />
      </Link>
      <span className="min-w-[140px] text-center text-sm font-bold text-ink">{monthLabel(month)}</span>
      <Link
        href={buildHref(shiftMonth(month, 1))}
        aria-label="Bulan berikutnya"
        className="inline-flex size-9 items-center justify-center rounded-full border border-line bg-surface text-ink-muted transition-colors hover:text-ink"
      >
        <ChevronRight className="size-4" aria-hidden />
      </Link>
    </div>
  );
}
