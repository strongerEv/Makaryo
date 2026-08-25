import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";
import type { AccountStatus, EmploymentStatus } from "@/lib/types/database";
import { ACCOUNT_STATUS_LABEL, EMPLOYMENT_STATUS_LABEL } from "@/lib/types/database";

export type Tone = "neutral" | "primary" | "success" | "warning" | "danger" | "info";

const TONES: Record<Tone, string> = {
  neutral: "bg-surface-muted text-ink-muted",
  primary: "bg-primary-soft text-primary",
  success: "bg-emerald-soft text-[#1f8a51]",
  warning: "bg-amber-soft text-[#9a6a12]",
  danger: "bg-coral-soft text-[#c73f35]",
  info: "bg-sky-soft text-[#1c6fa8]",
};

export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-semibold",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

const ACCOUNT_TONE: Record<AccountStatus, Tone> = {
  pending: "warning",
  active: "success",
  rejected: "danger",
  suspended: "danger",
};

export function AccountStatusBadge({ status }: { status: AccountStatus }) {
  return <Badge tone={ACCOUNT_TONE[status]}>{ACCOUNT_STATUS_LABEL[status]}</Badge>;
}

const EMPLOYMENT_TONE: Record<EmploymentStatus, Tone> = {
  active: "success",
  inactive: "neutral",
  long_leave: "info",
};

export function EmploymentStatusBadge({ status }: { status: EmploymentStatus }) {
  return <Badge tone={EMPLOYMENT_TONE[status]}>{EMPLOYMENT_STATUS_LABEL[status]}</Badge>;
}
