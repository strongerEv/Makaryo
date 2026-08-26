"use client";

import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { Brand } from "@/components/layout/brand";
import type { NavItem } from "@/components/layout/nav";
import { SidebarNav } from "@/components/layout/sidebar";

export function MobileDrawer({ items }: { items: NavItem[] }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open]);

  const panel = (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-ink/35" onClick={() => setOpen(false)} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Menu navigasi"
        className="relative flex h-full w-[270px] flex-col bg-surface px-4 py-5 shadow-[var(--shadow-pop)]"
      >
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
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Buka menu"
        aria-expanded={open}
        className="inline-flex size-10 items-center justify-center rounded-full text-ink transition-colors hover:bg-surface-muted lg:hidden"
      >
        <Menu className="size-5" aria-hidden />
      </button>

      {/*
        Header memakai backdrop-blur, dan properti itu membuat elemen fixed di dalamnya
        terkurung mengikuti tinggi header — drawer jadi tampil kosong. Karena itu panelnya
        dipasang langsung ke body lewat portal.
      */}
      {open && mounted ? createPortal(panel, document.body) : null}
    </>
  );
}
