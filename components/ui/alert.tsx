import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";

import { cn } from "@/lib/utils/cn";

const TONES = {
  info: { wrap: "bg-sky-soft text-[#1c6fa8]", Icon: Info },
  success: { wrap: "bg-emerald-soft text-[#1f8a51]", Icon: CheckCircle2 },
  error: { wrap: "bg-coral-soft text-[#c73f35]", Icon: AlertCircle },
  warning: { wrap: "bg-amber-soft text-[#9a6a12]", Icon: AlertCircle },
};

export function Alert({
  tone = "info",
  children,
  className,
}: {
  tone?: keyof typeof TONES;
  children: ReactNode;
  className?: string;
}) {
  const { wrap, Icon } = TONES[tone];
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("flex items-start gap-2.5 rounded-[var(--radius-md)] px-4 py-3 text-[13px] font-medium", wrap, className)}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
