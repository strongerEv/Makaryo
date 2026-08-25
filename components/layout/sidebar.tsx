"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Brand } from "@/components/layout/brand";
import type { NavItem } from "@/components/layout/nav";
import { cn } from "@/lib/utils/cn";

export function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNav({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1" aria-label="Navigasi utama">
      {items.map(({ href, label, icon: Icon }) => {
        const active = isActivePath(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-[var(--radius-md)] px-3.5 py-2.5 text-sm font-semibold transition-colors",
              active ? "bg-primary text-white" : "text-ink-muted hover:bg-surface-muted hover:text-ink",
            )}
          >
            <Icon className="size-[18px] shrink-0" aria-hidden />
            <span className="truncate">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar({ items, footer }: { items: NavItem[]; footer?: React.ReactNode }) {
  return (
    <aside className="fixed inset-y-0 left-0 hidden w-[260px] flex-col border-r border-line bg-surface px-4 py-6 lg:flex">
      <Brand className="mb-7 px-2" />
      <div className="flex-1 overflow-y-auto">
        <SidebarNav items={items} />
      </div>
      {footer ? <div className="mt-4 border-t border-line pt-4">{footer}</div> : null}
    </aside>
  );
}
