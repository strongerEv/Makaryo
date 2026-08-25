"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { markAllNotificationsReadAction, markNotificationReadAction } from "@/app/notifikasi/actions";
import { Button } from "@/components/ui/button";
import type { AppNotification } from "@/lib/types/database";
import { cn } from "@/lib/utils/cn";

export function NotificationLink({
  notification,
  timestamp,
}: {
  notification: AppNotification;
  timestamp: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const unread = !notification.read_at;

  const open = () => {
    startTransition(async () => {
      if (unread) {
        const formData = new FormData();
        formData.append("notificationId", notification.id);
        await markNotificationReadAction(formData);
      }
      if (notification.link) router.push(notification.link);
      else router.refresh();
    });
  };

  return (
    <button
      type="button"
      onClick={open}
      disabled={pending}
      className={cn(
        "flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-surface-muted sm:px-5",
        unread && "bg-primary-soft/40",
      )}
    >
      <span
        className={cn("mt-1.5 size-2 shrink-0 rounded-full", unread ? "bg-primary" : "bg-line")}
        aria-hidden
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-ink">{notification.title}</span>
        {notification.body ? (
          <span className="mt-0.5 block text-[13px] text-ink-muted">{notification.body}</span>
        ) : null}
        <span className="mt-1 block text-[11px] text-ink-muted">{timestamp}</span>
      </span>
    </button>
  );
}

export function MarkAllReadButton() {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => startTransition(() => markAllNotificationsReadAction())}
    >
      {pending ? "Menandai…" : "Tandai semua terbaca"}
    </Button>
  );
}
