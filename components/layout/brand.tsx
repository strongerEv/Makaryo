import { cn } from "@/lib/utils/cn";

export function Brand({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span className="inline-flex size-9 items-center justify-center rounded-[14px] bg-primary text-[15px] font-black text-white">
        M
      </span>
      {!compact ? (
        <span className="text-[17px] font-extrabold tracking-tight text-ink">Makaryo</span>
      ) : null}
    </span>
  );
}
