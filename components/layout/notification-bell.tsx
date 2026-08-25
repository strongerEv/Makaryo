import Link from "next/link";
import { Bell } from "lucide-react";

/** Lonceng dengan badge jumlah notifikasi belum dibaca. */
export function NotificationBell({ unread }: { unread: number }) {
  return (
    <Link
      href="/notifikasi"
      aria-label={unread > 0 ? `Notifikasi, ${unread} belum dibaca` : "Notifikasi"}
      className="relative inline-flex size-10 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
    >
      <Bell className="size-5" aria-hidden />
      {unread > 0 ? (
        <span className="absolute top-1 right-1 inline-flex min-w-4 items-center justify-center rounded-full bg-coral px-1 text-[10px] font-bold text-white">
          {unread > 9 ? "9+" : unread}
        </span>
      ) : null}
    </Link>
  );
}
