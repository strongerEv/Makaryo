import Link from "next/link";
import { Compass } from "lucide-react";

import { buttonClass } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-bg px-6 text-center">
      <span className="inline-flex size-16 items-center justify-center rounded-full bg-primary-soft text-primary">
        <Compass className="size-7" aria-hidden />
      </span>
      <h1 className="text-xl font-bold text-ink">Halaman tidak ditemukan</h1>
      <p className="max-w-sm text-[13px] text-ink-muted">
        Tautan yang kamu buka mungkin sudah berubah atau memang tidak ada.
      </p>
      <Link href="/" className={buttonClass({ className: "mt-2" })}>
        Kembali ke beranda
      </Link>
    </main>
  );
}
