"use client";

import { CalendarRange, CloudOff, Layers, Loader2, RotateCcw, Users, Wallet, Check } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { Alert } from "@/components/ui/alert";
import { buttonClass } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import {
  buildDefaultSandbox,
  sanitizeSandbox,
  type SandboxState,
  type SourceHost,
  type SourceShift,
} from "@/lib/scheduling/sandbox";
import { cn } from "@/lib/utils/cn";
import { formatDateTime } from "@/lib/utils/datetime";

import { saveSandboxAction } from "./actions";
import { HostsEditor } from "./hosts-editor";
import { LinesEditor } from "./lines-editor";
import { RecapView } from "./recap-view";
import { ScheduleView } from "./schedule-view";

export type UpdateSandbox = (updater: (state: SandboxState) => SandboxState) => void;

type Tab = "jadwal" | "lini" | "peserta" | "rekap";

const TABS: { value: Tab; label: string; icon: typeof CalendarRange }[] = [
  { value: "jadwal", label: "Jadwal", icon: CalendarRange },
  { value: "lini", label: "Lini & Shift", icon: Layers },
  { value: "peserta", label: "Peserta & Aturan", icon: Users },
  { value: "rekap", label: "Rekap", icon: Wallet },
];

type SaveStatus = "idle" | "pending" | "saving" | "saved" | "error";

/** Jeda sebelum perubahan dikirim, supaya mengetik tidak memicu simpan tiap huruf. */
const AUTOSAVE_DELAY = 1200;

export function SandboxApp({
  initial,
  initialSavedAt,
  storageReady,
  sourceShifts,
  sourceHosts,
  today,
}: {
  initial: SandboxState;
  initialSavedAt: string | null;
  storageReady: boolean;
  sourceShifts: SourceShift[];
  sourceHosts: SourceHost[];
  today: string;
}) {
  const [state, setState] = useState(initial);
  const [tab, setTab] = useState<Tab>("jadwal");
  const [status, setStatus] = useState<SaveStatus>(initialSavedAt ? "saved" : "idle");
  const [savedAt, setSavedAt] = useState(initialSavedAt);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [, startTransition] = useTransition();

  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(state);
  latest.current = state;

  const save = useCallback(() => {
    if (!storageReady) return;
    const payload = JSON.stringify(sanitizeSandbox(latest.current));
    setStatus("saving");
    startTransition(async () => {
      const result = await saveSandboxAction(payload);
      if (result.ok) {
        // Perubahan yang masuk selama penyimpanan akan dikirim di putaran berikutnya.
        if (JSON.stringify(sanitizeSandbox(latest.current)) === payload) dirty.current = false;
        setSavedAt(result.savedAt);
        setSaveError(null);
        setStatus(dirty.current ? "pending" : "saved");
      } else {
        setSaveError(result.error);
        setStatus("error");
      }
    });
  }, [storageReady]);

  const update: UpdateSandbox = useCallback(
    (updater) => {
      setState((prev) => updater(prev));
      dirty.current = true;
      if (!storageReady) return;
      setStatus("pending");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(save, AUTOSAVE_DELAY);
    },
    [save, storageReady],
  );

  // Ingatkan sebelum menutup halaman bila masih ada perubahan yang belum terkirim.
  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (dirty.current && storageReady) event.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [storageReady]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const resetAll = () => {
    update(() => buildDefaultSandbox({ shifts: sourceShifts, hosts: sourceHosts, today }));
    setResetOpen(false);
    setTab("jadwal");
  };

  return (
    <div className="space-y-4">
      {!storageReady ? (
        <Alert tone="warning">
          <span className="font-semibold">Simulasi belum bisa disimpan.</span> Tabel simulasi belum ada di
          database — jalankan migrasi <code>0018_schedule_sandbox.sql</code> di Supabase. Sementara itu
          semuanya tetap bisa dicoba, tetapi hilang saat halaman ditutup.
        </Alert>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5" role="tablist">
          {TABS.map((item) => {
            const Icon = item.icon;
            const aktif = tab === item.value;
            return (
              <button
                key={item.value}
                type="button"
                role="tab"
                aria-selected={aktif}
                onClick={() => setTab(item.value)}
                className={cn(
                  "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold transition-colors",
                  aktif ? "bg-primary text-white" : "bg-surface-muted text-ink-muted hover:text-ink",
                )}
              >
                <Icon className="size-4" aria-hidden />
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <SaveIndicator status={status} savedAt={savedAt} storageReady={storageReady} />
          <button
            type="button"
            onClick={() => setResetOpen(true)}
            className={buttonClass({ variant: "ghost", size: "sm" })}
            title="Kembalikan simulasi ke isi awal"
          >
            <RotateCcw className="size-4" aria-hidden />
            <span className="hidden sm:inline">Mulai ulang</span>
          </button>
        </div>
      </div>

      {saveError ? (
        <Alert tone="error">
          {saveError}{" "}
          <button type="button" onClick={save} className="font-semibold underline">
            Coba simpan lagi
          </button>
        </Alert>
      ) : null}

      {tab === "jadwal" ? <ScheduleView state={state} update={update} today={today} /> : null}
      {tab === "lini" ? <LinesEditor state={state} update={update} sourceShifts={sourceShifts} /> : null}
      {tab === "peserta" ? <HostsEditor state={state} update={update} sourceHosts={sourceHosts} /> : null}
      {tab === "rekap" ? <RecapView state={state} update={update} /> : null}

      <Modal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="Mulai ulang simulasi?"
        description="Semua lini, shift, peserta, dan jadwal di simulasi ini dikembalikan ke isi awal. Jadwal asli tidak tersentuh."
      >
        <p className="mb-4 text-[13px] text-ink-muted">
          Isi awal: lini Tumbler dan Celana dengan shift dari Pengaturan Shift, seluruh host aktif sebagai host
          tetap, dan dua freelance bertarif Rp10.000/jam.
        </p>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => setResetOpen(false)} className={buttonClass({ variant: "ghost" })}>
            Batal
          </button>
          <button type="button" onClick={resetAll} className={buttonClass({ variant: "danger" })}>
            <RotateCcw className="size-4" aria-hidden />
            Mulai ulang
          </button>
        </div>
      </Modal>
    </div>
  );
}

function SaveIndicator({
  status,
  savedAt,
  storageReady,
}: {
  status: SaveStatus;
  savedAt: string | null;
  storageReady: boolean;
}) {
  if (!storageReady) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#9a6a12]">
        <CloudOff className="size-4" aria-hidden />
        Tidak tersimpan
      </span>
    );
  }

  if (status === "pending" || status === "saving") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-ink-muted" aria-live="polite">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        Menyimpan…
      </span>
    );
  }

  if (status === "error") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-coral" aria-live="polite">
        <CloudOff className="size-4" aria-hidden />
        Gagal menyimpan
      </span>
    );
  }

  if (status === "saved" && savedAt) {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#1f8a51]"
        title={`Tersimpan ${formatDateTime(savedAt)}`}
        aria-live="polite"
      >
        <Check className="size-4" aria-hidden />
        Tersimpan
      </span>
    );
  }

  return <span className="text-[12px] font-semibold text-ink-muted">Belum ada perubahan</span>;
}
