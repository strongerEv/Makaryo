import "server-only";

import webpush from "web-push";

import { createAdminClient } from "@/lib/supabase/admin";

export type PushPayload = {
  title: string;
  body?: string;
  link?: string;
  /** Reminder memicu suara alarm dan getar lebih panjang di service worker. */
  urgent?: boolean;
  tag?: string;
};

let configured: boolean | null = null;

function ensureConfigured() {
  if (configured !== null) return configured;

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:admin@makaryo.app";

  if (!publicKey || !privateKey) {
    configured = false;
    return configured;
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return configured;
}

/**
 * Mengirim web push ke seluruh perangkat milik pengguna.
 * Langganan yang sudah tidak valid (404/410) dibersihkan otomatis.
 */
export async function sendPushToUsers(userIds: string[], payload: PushPayload) {
  const targets = [...new Set(userIds)].filter(Boolean);
  if (targets.length === 0) return { sent: 0, skipped: true };
  if (!ensureConfigured()) return { sent: 0, skipped: true };

  const admin = createAdminClient();
  const { data } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .in("user_id", targets);

  const subscriptions = data ?? [];
  if (subscriptions.length === 0) return { sent: 0, skipped: false };

  const staleIds: string[] = [];
  let sent = 0;

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          JSON.stringify(payload),
          { TTL: 60 * 30, urgency: payload.urgent ? "high" : "normal" },
        );
        sent += 1;
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) staleIds.push(subscription.id);
      }
    }),
  );

  if (staleIds.length > 0) {
    await admin.from("push_subscriptions").delete().in("id", staleIds);
  }

  return { sent, skipped: false };
}
