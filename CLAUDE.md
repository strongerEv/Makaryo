# HostFlow — Aplikasi Manajemen Karyawan Host Live Streaming

PWA untuk mengelola operasional karyawan host live streaming: absensi berfoto + GPS,
penjadwalan shift otomatis, pengajuan izin/libur, pengingat jam kerja, pelaporan omzet,
dan pelaporan administratif.

## Baca ini dulu

Sebelum menulis kode apa pun di sesi mana pun, baca berurutan:

1. `docs/01-spesifikasi-fungsional.md` — apa yang harus dibangun (sumber kebenaran fitur)
2. `docs/02-database.md` — skema tabel, relasi, dan aturan RLS
3. `docs/03-design-system.md` — token warna, komponen, dan aturan responsif
4. `docs/04-roadmap-sesi.md` — sesi ini mengerjakan bagian yang mana, dan definisi selesainya

Jangan mengulang diskusi requirement. Semua keputusan sudah dikunci di dokumen di atas.
Kalau menemukan hal yang benar-benar belum diputuskan, catat di
`docs/99-open-questions.md` lalu lanjut dengan asumsi paling wajar dan tulis asumsinya.

## Stack

| Lapisan | Pilihan |
|---|---|
| Framework | Next.js 15 (App Router) + TypeScript strict |
| Styling | Tailwind CSS v4 + komponen sendiri (lihat design system) |
| Database | Supabase Postgres + Row Level Security |
| Auth | Supabase Auth (email + password), role di tabel `profiles` |
| Storage | Supabase Storage — bucket `attendance` (selfie) & `revenue` (bukti omzet) |
| Penjadwalan | Algoritma rule-based di `lib/scheduling/` — deterministik, tanpa panggilan LLM |
| Notifikasi | Service Worker + Web Push (VAPID) |
| Cron | Vercel Cron → route handler `/api/cron/*` |
| Chart | Recharts |
| Export | PDF via `@react-pdf/renderer`, Excel via `exceljs` |
| Deploy | Vercel |

## Aturan kerja

- **Bahasa UI: Indonesia.** Nama variabel, fungsi, tabel, dan kolom: Inggris.
- Zona waktu operasional **Asia/Jakarta (WIB)**. Simpan semua timestamp sebagai `timestamptz`
  UTC di database, konversi ke WIB hanya di lapisan tampilan.
- Mobile-first. Setiap halaman wajib benar di 360px **dan** di 1440px sebelum dianggap selesai.
- Jangan pernah menaruh `SUPABASE_SERVICE_ROLE_KEY` di kode yang terkirim ke browser.
  Kunci itu hanya boleh dipakai di route handler / server action.
- Setiap sesi diakhiri dengan commit yang jalan (`npm run build` hijau) dan push.

## Struktur direktori

```
app/
  (auth)/login, forgot-password, reset-password
  (host)/        — halaman untuk role host
  (admin)/       — halaman untuk role admin
  api/           — route handler (cron, push, export)
components/
  ui/            — primitif: Button, Card, Input, Sheet, dst
  layout/        — AppShell, BottomNav, Sidebar, PageHeader
lib/
  supabase/      — client browser & server
  scheduling/    — mesin penjadwalan rule-based
  push/          — helper web push
  utils/
supabase/
  migrations/    — file SQL bernomor urut
docs/
```

## Perintah

```bash
npm run dev        # server pengembangan
npm run build      # wajib hijau sebelum commit
npm run lint
npm run typecheck
```

## Peran & hak akses

- **Admin** (satu level, tanpa hierarki) — akses penuh ke seluruh host, jadwal, approval,
  laporan, pengaturan shift, dan audit log.
- **Host** — hanya melihat dan mengubah datanya sendiri: absensi, jadwal, pengajuan,
  dan input omzet shift-nya.

Akun host **dibuat oleh admin**, tidak ada pendaftaran mandiri.
