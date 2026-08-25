import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

const CONTROL =
  "w-full rounded-[var(--radius-md)] border border-line bg-surface px-4 text-sm text-ink placeholder:text-ink-muted/70 transition-colors focus:border-primary focus:outline-none disabled:bg-surface-muted disabled:text-ink-muted";

export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
  className,
}: {
  label: ReactNode;
  htmlFor?: string;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-[13px] font-semibold text-ink">
        {label}
        {required ? <span className="ml-0.5 text-coral">*</span> : null}
      </label>
      {children}
      {hint && !error ? <p className="text-[12px] text-ink-muted">{hint}</p> : null}
      {error ? <p className="text-[12px] font-medium text-coral">{error}</p> : null}
    </div>
  );
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(CONTROL, "h-11", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(CONTROL, "min-h-24 py-3", className)} {...props} />;
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <select className={cn(CONTROL, "h-11 pr-9", className)} {...props}>
      {children}
    </select>
  );
}
