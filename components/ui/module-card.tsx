import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils/cn";

const TONES = {
  primary: "bg-primary",
  coral: "bg-coral",
  amber: "bg-amber",
  emerald: "bg-emerald",
  sky: "bg-sky",
};

/** Kartu modul berwarna penuh, mengikuti referensi desain. */
export function ModuleCard({
  href,
  title,
  description,
  icon: Icon,
  tone = "primary",
  className,
}: {
  href: string;
  title: string;
  description?: string;
  icon: LucideIcon;
  tone?: keyof typeof TONES;
  className?: string;
}) {
  const dark = tone === "amber";

  return (
    <Link
      href={href}
      className={cn(
        "group relative flex min-h-[124px] flex-col justify-between overflow-hidden rounded-[var(--radius-card)] p-4 transition-transform hover:-translate-y-0.5 sm:p-5",
        TONES[tone],
        dark ? "text-ink" : "text-white",
        className,
      )}
    >
      <span
        className={cn(
          "inline-flex size-10 items-center justify-center rounded-full",
          dark ? "bg-ink/10" : "bg-white/20",
        )}
      >
        <Icon className="size-5" aria-hidden />
      </span>
      <span className="mt-3 block">
        <span className="block text-[15px] font-bold leading-tight">{title}</span>
        {description ? (
          <span className={cn("mt-0.5 block text-[12px]", dark ? "text-ink/70" : "text-white/80")}>
            {description}
          </span>
        ) : null}
      </span>
    </Link>
  );
}
