import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-4 px-4 py-6 sm:px-6 lg:px-8">
      <Skeleton className="h-8 w-56" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-[104px] rounded-[var(--radius-card)]" />
        ))}
      </div>
      <Skeleton className="h-72 rounded-[var(--radius-card)]" />
    </div>
  );
}
