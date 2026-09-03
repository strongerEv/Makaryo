"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId } from "react";

import { createClient } from "@/lib/supabase/client";

/** Tabel yang sudah terdaftar di publikasi realtime (lihat migrasi 0010). */
export type LiveTable =
  | "attendances"
  | "schedule_assignments"
  | "revenue_reports"
  | "leave_requests"
  | "notifications"
  | "profiles";

/** Perubahan yang datang berbarengan digabung jadi satu penyegaran. */
const DEBOUNCE_MS = 350;

/**
 * Batas tunggu terlama. Aksi massal seperti generate jadwal mengirim ratusan
 * perubahan beruntun; tanpa batas ini penyegaran bisa tertunda terus selama
 * kejadian masih mengalir.
 */
const MAX_WAIT_MS = 2000;

/**
 * Menyegarkan data halaman begitu tabel yang dipantau berubah di database,
 * tanpa perlu refresh manual.
 *
 * Yang dipakai hanyalah sinyal "ada yang berubah" — isi payload-nya diabaikan,
 * lalu `router.refresh()` mengambil ulang data dari server. Dengan begitu hasil
 * yang tampil tetap melewati Row Level Security dan tidak pernah menampilkan
 * baris yang bukan hak penggunanya.
 */
export function useLiveSync(tables: LiveTable[]) {
  const router = useRouter();
  const instanceId = useId();
  // Daftar tabel biasanya literal inline, jadi dibandingkan sebagai teks
  // supaya efeknya tidak dijalankan ulang tiap render.
  const tableKey = [...tables].sort().join(",");

  useEffect(() => {
    if (!tableKey) return;

    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let firstPendingAt = 0;

    const runRefresh = () => {
      timer = undefined;
      firstPendingAt = 0;
      router.refresh();
    };

    const refreshSoon = () => {
      const now = Date.now();
      if (!firstPendingAt) firstPendingAt = now;

      if (now - firstPendingAt >= MAX_WAIT_MS) {
        if (timer) clearTimeout(timer);
        runRefresh();
        return;
      }

      if (timer) clearTimeout(timer);
      const sisaBatas = MAX_WAIT_MS - (now - firstPendingAt);
      timer = setTimeout(runRefresh, Math.min(DEBOUNCE_MS, sisaBatas));
    };

    const channel = supabase.channel(`live-sync:${instanceId}:${tableKey}`);
    for (const table of tableKey.split(",")) {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, refreshSoon);
    }
    channel.subscribe();

    // Jaring pengaman: koneksi bisa terputus saat tab lama tidak aktif
    // (ponsel terkunci, tab dibiarkan di belakang), jadi begitu tab dibuka
    // lagi datanya diambil ulang sekali.
    const onVisible = () => {
      if (document.visibilityState === "visible") refreshSoon();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      void supabase.removeChannel(channel);
    };
  }, [tableKey, instanceId, router]);
}

/**
 * Versi komponen dari {@link useLiveSync}, supaya server component bisa
 * memasang sinkron otomatis tanpa ikut jadi client component.
 */
export function LiveSync({ tables }: { tables: LiveTable[] }) {
  useLiveSync(tables);
  return null;
}
