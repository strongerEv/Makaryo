"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { isActivePath } from "@/components/layout/sidebar";
import type { NavItem } from "@/components/layout/nav";
import { NAV_ICONS } from "@/components/layout/nav-icons";
import { cn } from "@/lib/utils/cn";

export function BottomNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const visible = items.filter((item) => item.primary);

  return (
    <nav
      aria-label="Navigasi utama"
      className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] lg:hidden"
    >
      <ul className="mx-auto flex max-w-md items-center justify-between gap-1 rounded-full bg-primary px-2.5 py-2 shadow-[var(--shadow-float)]">
        {visible.map(({ href, label, icon }) => {
          const Icon = NAV_ICONS[icon];
          const active = isActivePath(pathname, href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-11 flex-col items-center justify-center gap-0.5 rounded-full transition-colors",
                  active ? "bg-white text-primary" : "text-white/75 hover:text-white",
                )}
              >
                <Icon className="size-5" aria-hidden />
                <span className="sr-only">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
