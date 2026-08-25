import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

type Variant = "primary" | "soft" | "ghost" | "outline" | "danger" | "success";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-primary text-white hover:bg-primary-dark shadow-[var(--shadow-float)]",
  soft: "bg-primary-soft text-primary hover:bg-primary/15",
  ghost: "text-ink-muted hover:bg-surface-muted hover:text-ink",
  outline: "border border-line bg-surface text-ink hover:bg-surface-muted",
  danger: "bg-coral text-white hover:brightness-95",
  success: "bg-emerald text-white hover:brightness-95",
};

const SIZES: Record<Size, string> = {
  sm: "h-9 px-3.5 text-[13px] gap-1.5",
  md: "h-11 px-5 text-sm gap-2",
  lg: "h-13 px-6 text-[15px] gap-2",
};

export function buttonClass({
  variant = "primary",
  size = "md",
  block,
  className,
}: {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  className?: string;
} = {}) {
  return cn(
    "inline-flex items-center justify-center rounded-full font-semibold transition-colors",
    "disabled:pointer-events-none disabled:opacity-55",
    VARIANTS[variant],
    SIZES[size],
    block && "w-full",
    className,
  );
}

type ButtonProps = ComponentProps<"button"> & {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  children: ReactNode;
};

export function Button({ variant, size, block, className, children, ...props }: ButtonProps) {
  return (
    <button className={buttonClass({ variant, size, block, className })} {...props}>
      {children}
    </button>
  );
}

type ButtonLinkProps = ComponentProps<typeof Link> & {
  variant?: Variant;
  size?: Size;
  block?: boolean;
};

export function ButtonLink({ variant, size, block, className, ...props }: ButtonLinkProps) {
  return <Link className={buttonClass({ variant, size, block, className })} {...props} />;
}
