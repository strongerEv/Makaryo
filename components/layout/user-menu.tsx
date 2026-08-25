"use client";

import Link from "next/link";
import { ChevronDown, LogOut, UserCog } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { signOutAction } from "@/app/(auth)/actions";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils/cn";

export function UserMenu({
  name,
  roleLabel,
  avatarUrl,
  profileHref,
  compact,
}: {
  name: string;
  roleLabel: string;
  avatarUrl?: string | null;
  profileHref: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={cn(
          "flex w-full items-center gap-2.5 rounded-full p-1 text-left transition-colors hover:bg-surface-muted",
          compact ? "pr-1" : "pr-3",
        )}
      >
        <Avatar name={name} src={avatarUrl} size="sm" />
        {!compact ? (
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-semibold text-ink">{name}</span>
            <span className="block text-[11px] text-ink-muted">{roleLabel}</span>
          </span>
        ) : null}
        {!compact ? <ChevronDown className="size-4 shrink-0 text-ink-muted" aria-hidden /> : null}
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 bottom-full z-50 mb-2 w-56 overflow-hidden rounded-[var(--radius-md)] border border-line bg-surface p-1.5 shadow-[var(--shadow-pop)] lg:top-full lg:bottom-auto lg:mt-2 lg:mb-0"
        >
          <Link
            href={profileHref}
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 rounded-[12px] px-3 py-2.5 text-[13px] font-semibold text-ink transition-colors hover:bg-surface-muted"
          >
            <UserCog className="size-4 text-ink-muted" aria-hidden />
            Profil saya
          </Link>
          <form action={signOutAction}>
            <button
              type="submit"
              role="menuitem"
              className="flex w-full items-center gap-2.5 rounded-[12px] px-3 py-2.5 text-[13px] font-semibold text-coral transition-colors hover:bg-coral-soft"
            >
              <LogOut className="size-4" aria-hidden />
              Keluar
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
