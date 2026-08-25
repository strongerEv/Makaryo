"use client";

import { Bell, BellOff, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

type State = "unsupported" | "default" | "granted" | "denied" | "subscribed";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
}

/**
 * Meminta izin notifikasi dengan penjelasan lebih dulu, lalu menyimpan langganan push.
 * iOS hanya mengizinkan push setelah aplikasi dipasang ke home screen.
 */
export function NotificationSettings({ vapidPublicKey }: { vapidPublicKey?: string }) {
  const [state, setState] = useState<State>("default");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState("unsupported");
      return;
    }

    const permission = Notification.permission;
    if (permission === "denied") {
      setState("denied");
      return;
    }

    navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => setState(subscription ? "subscribed" : permission === "granted" ? "granted" : "default"))
      .catch(() => setState("default"));
  }, []);

  const enable = async () => {
    if (!vapidPublicKey) {
      setMessage("Kunci VAPID belum diatur di server. Hubungi pengelola aplikasi.");
      return;
    }

    setBusy(true);
    setMessage(null);

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "default");
        setMessage("Izin notifikasi belum diberikan.");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      const response = await fetch("/api/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });

      if (!response.ok) throw new Error("gagal");

      setState("subscribed");
      setMessage("Notifikasi aktif di perangkat ini.");
    } catch {
      setMessage("Gagal mengaktifkan notifikasi. Coba lagi dari perangkat ini.");
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await fetch("/api/push", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }
      setState("granted");
      setMessage("Notifikasi dimatikan di perangkat ini.");
    } finally {
      setBusy(false);
    }
  };

  if (state === "unsupported") {
    return (
      <Alert tone="warning">
        Browser ini belum mendukung notifikasi push. Di iPhone, pasang dulu aplikasinya ke home screen
        lewat Safari, lalu buka dari sana.
      </Alert>
    );
  }

  return (
    <div className="space-y-3">
      {message ? <Alert tone={state === "subscribed" ? "success" : "info"}>{message}</Alert> : null}

      {state === "denied" ? (
        <Alert tone="error">
          Notifikasi diblokir di browser ini. Buka pengaturan situs di browser, izinkan notifikasi untuk
          Makaryo, lalu muat ulang halaman.
        </Alert>
      ) : null}

      <div className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] bg-surface-muted px-4 py-3">
        <span className="flex items-center gap-2.5 text-[13px] font-semibold text-ink">
          {state === "subscribed" ? (
            <Bell className="size-4 text-emerald" aria-hidden />
          ) : (
            <BellOff className="size-4 text-ink-muted" aria-hidden />
          )}
          {state === "subscribed" ? "Aktif di perangkat ini" : "Belum aktif"}
        </span>

        {state === "subscribed" ? (
          <Button variant="outline" size="sm" onClick={disable} disabled={busy}>
            Matikan
          </Button>
        ) : (
          <Button size="sm" onClick={enable} disabled={busy || state === "denied"}>
            {busy ? "Memproses…" : "Aktifkan"}
          </Button>
        )}
      </div>

      <p className="flex items-start gap-2 text-[12px] text-ink-muted">
        <Smartphone className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        Pengingat dikirim 1 jam, 30 menit, dan 15 menit sebelum shift dimulai, lengkap dengan getar.
        Aktifkan di setiap perangkat yang kamu pakai.
      </p>
    </div>
  );
}
