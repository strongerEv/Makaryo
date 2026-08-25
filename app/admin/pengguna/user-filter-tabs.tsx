"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils/cn";

const TABS = [
  { value: "all", label: "Semua" },
  { value: "pending", label: "Menunggu verifikasi" },
  { value: "active", label: "Aktif" },
  { value: "inactive", label: "Nonaktif & ditolak" },
];

export function UserFilterTabs({ active, pendingCount }: { active: string; pendingCount: number }) {
  const searchParams = useSearchParams();

  const hrefFor = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") params.delete("status");
    else params.set("status", value);
    const query = params.toString();
    return query ? `/admin/pengguna?${query}` : "/admin/pengguna";
  };

  return (
    <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" role="tablist">
      {TABS.map((tab) => {
        const isActive = active === tab.value;
        return (
          <Link
            key={tab.value}
            href={hrefFor(tab.value)}
            role="tab"
            aria-selected={isActive}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-semibold transition-colors",
              isActive ? "bg-primary text-white" : "bg-surface-muted text-ink-muted hover:text-ink",
            )}
          >
            {tab.label}
            {tab.value === "pending" && pendingCount > 0 ? (
              <span
                className={cn(
                  "inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-bold",
                  isActive ? "bg-white text-primary" : "bg-amber text-ink",
                )}
              >
                {pendingCount}
              </span>
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}
