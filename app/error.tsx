"use client";

import { TriangleAlert } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

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
        Halaman ini gagal dimuat. Coba muat ulang; kalau masih bermasalah, hubungi admin.
      </p>
      <Button className="mt-2" onClick={reset}>
        Coba lagi
      </Button>
    </main>
  );
}
