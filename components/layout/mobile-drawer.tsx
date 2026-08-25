"use client";

import { Menu, X } from "lucide-react";
import { useState } from "react";

import { Brand } from "@/components/layout/brand";
import type { NavItem } from "@/components/layout/nav";
import { SidebarNav } from "@/components/layout/sidebar";

export function MobileDrawer({ items }: { items: NavItem[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Buka menu"
        className="inline-flex size-10 items-center justify-center rounded-full text-ink transition-colors hover:bg-surface-muted lg:hidden"
      >
        <Menu className="size-5" aria-hidden />
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink/35" onClick={() => setOpen(false)} aria-hidden />
          <div className="relative flex h-full w-[270px] flex-col bg-surface px-4 py-5 shadow-[var(--shadow-pop)]">
            <div className="mb-6 flex items-center justify-between">
              <Brand />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Tutup menu"
                className="inline-flex size-9 items-center justify-center rounded-full text-ink-muted hover:bg-surface-muted"
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <SidebarNav items={items} onNavigate={() => setOpen(false)} />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
