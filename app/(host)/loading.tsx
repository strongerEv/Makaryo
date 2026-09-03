import { Skeleton } from "@/components/ui/skeleton";

/** Kerangka isi halaman host, tampil seketika saat berpindah menu. */
export default function Loading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-9 w-52" />
      <Skeleton className="h-32 rounded-[var(--radius-card)]" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-[104px] rounded-[var(--radius-card)]" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-[var(--radius-card)]" />
    </div>
  );
}
