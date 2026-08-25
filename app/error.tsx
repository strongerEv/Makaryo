"use client";

import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { useEffect } from "react";

import { Button, buttonClass } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-bg px-6 text-center">
      <span className="inline-flex size-16 items-center justify-center rounded-full bg-coral-soft text-coral">
        <TriangleAlert className="size-7" aria-hidden />
      </span>

      <h1 className="text-xl font-bold text-ink">Terjadi kesalahan</h1>
      <p className="max-w-sm text-[13px] text-ink-muted">
        Halaman ini gagal dimuat. Coba muat ulang; kalau masih bermasalah, sebutkan kode di bawah
        saat melapor ke admin agar mudah ditelusuri.
      </p>

      {error.digest ? (
        <p className="tabular rounded-full bg-surface-muted px-3.5 py-1.5 text-[12px] font-semibold text-ink-muted">
          Kode: {error.digest}
        </p>
      ) : null}

      <div className="mt-2 flex flex-wrap justify-center gap-2">
        <Button onClick={reset}>Coba lagi</Button>
        <Link href="/" className={buttonClass({ variant: "outline" })}>
          Kembali ke awal
        </Link>
      </div>
    </main>
  );
}
