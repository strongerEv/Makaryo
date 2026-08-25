import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

const TONES = {
  primary: "bg-primary-soft text-primary",
  coral: "bg-coral-soft text-coral",
  amber: "bg-amber-soft text-[#9a6a12]",
  emerald: "bg-emerald-soft text-[#1f8a51]",
  sky: "bg-sky-soft text-[#1c6fa8]",
  neutral: "bg-surface-muted text-ink-muted",
};

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "neutral",
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: LucideIcon;
  tone?: keyof typeof TONES;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-card)] border border-line bg-surface p-4 shadow-[var(--shadow-card)] sm:p-5",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[12px] font-semibold text-ink-muted">{label}</p>
        {Icon ? (
          <span className={cn("inline-flex size-8 items-center justify-center rounded-full", TONES[tone])}>
            <Icon className="size-4" aria-hidden />
          </span>
        ) : null}
      </div>
      <p className="tabular mt-2 text-[26px] font-bold leading-none text-ink sm:text-[28px]">{value}</p>
      {hint ? <p className="mt-1.5 text-[12px] text-ink-muted">{hint}</p> : null}
    </div>
  );
}
