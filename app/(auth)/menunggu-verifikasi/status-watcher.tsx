"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";

const POLL_INTERVAL_MS = 15_000;

/** Memeriksa status akun secara berkala agar pengguna otomatis masuk begitu admin menyetujui. */
export function StatusWatcher({ userId }: { userId: string }) {
  const router = useRouter();
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    const check = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("account_status")
        .eq("id", userId)
        .single();

      if (cancelled) return;
      setCheckedAt(new Date());
      if (data && data.account_status !== "pending") router.refresh();
    };

    const timer = setInterval(check, POLL_INTERVAL_MS);
    void check();

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [router, userId]);

  return (
    <p className="mt-4 text-[12px] text-ink-muted" aria-live="polite">
      {checkedAt
        ? `Status terakhir diperiksa pukul ${checkedAt.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`
        : "Memeriksa status akun…"}
    </p>
  );
}
