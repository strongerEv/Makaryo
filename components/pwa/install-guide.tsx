"use client";

import { Share, SquarePlus } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/** Panduan pemasangan ke home screen; Android dapat tombol pasang, iOS dapat langkah manual. */
export function InstallGuide() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    setIsIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    setInstalled(window.matchMedia("(display-mode: standalone)").matches);

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (installed) {
    return (
      <p className="rounded-[var(--radius-md)] bg-emerald-soft px-4 py-3 text-[13px] font-semibold text-[#1f8a51]">
        Aplikasi sudah terpasang di perangkat ini.
      </p>
    );
  }

  if (isIos) {
    return (
      <ol className="space-y-2 text-[13px] text-ink-muted">
        <li className="flex gap-2">
          <Share className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          Buka Makaryo di Safari, lalu ketuk tombol Bagikan.
        </li>
        <li className="flex gap-2">
          <SquarePlus className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          Pilih &ldquo;Tambahkan ke Layar Utama&rdquo;, lalu buka Makaryo dari ikon barunya.
        </li>
        <li className="text-[12px]">
          Notifikasi di iPhone hanya berfungsi setelah aplikasi dibuka dari ikon home screen.
        </li>
      </ol>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-[13px] text-ink-muted">
        Pasang Makaryo ke home screen agar terbuka seperti aplikasi biasa dan notifikasinya lebih andal.
      </p>
      {promptEvent ? (
        <Button
          onClick={async () => {
            await promptEvent.prompt();
            const choice = await promptEvent.userChoice;
            if (choice.outcome === "accepted") setInstalled(true);
            setPromptEvent(null);
          }}
        >
          Pasang aplikasi
        </Button>
      ) : (
        <p className="text-[12px] text-ink-muted">
          Buka menu browser (⋮) lalu pilih &ldquo;Instal aplikasi&rdquo; atau &ldquo;Tambahkan ke layar utama&rdquo;.
        </p>
      )}
    </div>
  );
}
