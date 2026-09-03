import Image from "next/image";
import { CalendarCheck2, Camera, TrendingUp } from "lucide-react";

import { Brand } from "@/components/layout/brand";

const HIGHLIGHTS = [
  {
    icon: CalendarCheck2,
    title: "Jadwal shift otomatis",
    description: "Libur tersebar rata, tidak menumpuk di hari berurutan.",
  },
  {
    icon: Camera,
    title: "Absensi berfoto & lokasi",
    description: "Kehadiran terekam lengkap dengan selfie dan titik GPS.",
  },
  {
    icon: TrendingUp,
    title: "Rekap omzet rapi",
    description: "Setoran tiap shift langsung jadi laporan siap ekspor.",
  },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-bg lg:grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      {/* Panel cerita produk — hanya muncul di layar lebar. */}
      <aside className="relative hidden overflow-hidden bg-primary-dark p-10 xl:p-12 lg:flex lg:flex-col lg:justify-between">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_15%_0%,#6f5ff0_0%,#4a3cc9_45%,#2f2694_100%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-16 size-[420px] rounded-full bg-white/10 blur-3xl"
        />

        <div className="relative">
          <Brand tone="light" size="lg" />
        </div>

        <div className="relative my-8">
          <h2 className="max-w-[16ch] text-[32px] leading-[1.15] font-extrabold tracking-tight text-white xl:text-[38px]">
            Kelola tim host live streaming tanpa ribet.
          </h2>
          <p className="mt-3 max-w-[42ch] text-[14px] leading-relaxed text-white/70">
            Absensi, jadwal, pengajuan izin, sampai laporan omzet — semuanya dalam satu tempat.
          </p>

          <Image
            src="/studio-makaryo.webp"
            alt="Ilustrasi studio live streaming lengkap dengan kamera, lampu, dan latar foto"
            width={900}
            height={850}
            priority
            sizes="(min-width: 1280px) 28rem, 23rem"
            className="mt-8 h-auto w-full max-w-[400px] drop-shadow-[0_28px_56px_rgba(12,8,50,0.5)] xl:max-w-[440px]"
          />
        </div>

        <ul className="relative grid gap-3">
          {HIGHLIGHTS.map(({ icon: Icon, title, description }) => (
            <li key={title} className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-[12px] bg-white/15 text-white">
                <Icon className="size-[18px]" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block text-[14px] font-bold text-white">{title}</span>
                <span className="block text-[13px] leading-snug text-white/65">{description}</span>
              </span>
            </li>
          ))}
        </ul>
      </aside>

      {/* Kolom formulir. */}
      <div className="relative flex min-h-dvh flex-col lg:min-h-0">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-primary-soft to-transparent lg:hidden"
        />

        <main className="relative mx-auto flex w-full max-w-[440px] flex-1 flex-col justify-center px-5 py-8 sm:py-10">
          {/* Ringkasan merek versi ponsel — panel kiri tidak tampil di sini. */}
          <div className="mb-6 flex flex-col items-center text-center lg:hidden">
            <Brand />
            <Image
              src="/studio-makaryo.webp"
              alt=""
              width={900}
              height={850}
              priority
              sizes="14rem"
              aria-hidden
              className="mt-4 h-auto w-[176px] max-w-full drop-shadow-[0_16px_32px_rgba(30,33,69,0.16)] sm:w-[216px]"
            />
          </div>

          {children}
        </main>

        <footer className="relative px-5 pb-6 text-center text-[12px] text-ink-muted">
          Makaryo · Manajemen host live streaming
        </footer>
      </div>
    </div>
  );
}
