# Makaryo

Aplikasi web (PWA) untuk mengelola operasional karyawan host live streaming — absensi berfoto
dan berlokasi, penjadwalan shift otomatis, pengajuan izin dan libur, pengingat jam kerja,
pelaporan omzet, serta laporan administratif.

Dua peran: **Admin** (satu level, mengelola semuanya) dan **Host** (melihat dan mengisi datanya sendiri).

## Status

Sesi 1 & 2 selesai — fondasi aplikasi, autentikasi dengan verifikasi admin, kelola pengguna,
dan pengaturan shift. Modul berikutnya menyusul sesuai [`docs/04-roadmap-sesi.md`](docs/04-roadmap-sesi.md).

Sudah berjalan:

- Login, daftar mandiri, lupa & reset kata sandi
- Alur verifikasi admin: pendaftar masuk antrian dan menunggu di halaman khusus sampai disetujui
- Kelola pengguna: verifikasi, tambah manual, edit, nonaktifkan, hapus permanen
- Pengaturan shift dan jam operasional
- Kerangka responsif: bottom nav di ponsel, sidebar di laptop

## Menjalankan secara lokal

### 1. Siapkan proyek Supabase

Buat proyek baru di [supabase.com](https://supabase.com), lalu jalankan isi berkas
`supabase/migrations/*.sql` **berurutan** lewat SQL Editor (atau `supabase db push`
bila memakai Supabase CLI).

Migrasi tersebut membuat tabel `profiles`, `shifts`, `app_settings`, `audit_logs`,
seluruh kebijakan RLS, bucket Storage `avatars`, serta tiga shift bawaan 06.00–21.00.

### 2. Isi environment

```bash
cp .env.example .env.local
```

Isi dari Supabase → Project Settings → API:

| Variabel | Keterangan |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL proyek |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Kunci publik (anon) |
| `SUPABASE_SERVICE_ROLE_KEY` | Kunci service role — **hanya dipakai di server**, jangan pernah di-commit |
| `NEXT_PUBLIC_SITE_URL` | URL aplikasi, untuk tautan reset kata sandi |

### 3. Buat admin pertama

Pendaftaran mandiri selalu menghasilkan host berstatus menunggu verifikasi, jadi admin pertama
dibuat manual:

1. Daftar lewat halaman `/daftar`.
2. Jalankan SQL berikut di Supabase SQL Editor:

```sql
update public.profiles
set role = 'admin', account_status = 'active'
where email = 'email-kamu@contoh.com';
```

Setelah itu seluruh akun berikutnya bisa dibuat atau diverifikasi dari halaman Kelola Pengguna.

### 4. Jalankan

```bash
npm install
npm run dev
```

Buka http://localhost:3000.

## Perintah

```bash
npm run dev        # server pengembangan
npm run build      # wajib hijau sebelum commit
npm run lint
npm run typecheck
```

## Dokumentasi

| Dokumen | Isi |
|---|---|
| [`CLAUDE.md`](CLAUDE.md) | Panduan kerja, stack, struktur direktori, konvensi |
| [`docs/01-spesifikasi-fungsional.md`](docs/01-spesifikasi-fungsional.md) | Seluruh kebutuhan fungsional & peta halaman |
| [`docs/02-database.md`](docs/02-database.md) | Skema tabel, relasi, dan aturan RLS |
| [`docs/03-design-system.md`](docs/03-design-system.md) | Token warna, tipografi, komponen, aturan responsif |
| [`docs/04-roadmap-sesi.md`](docs/04-roadmap-sesi.md) | Pembagian pekerjaan menjadi 10 sesi |
| [`docs/99-open-questions.md`](docs/99-open-questions.md) | Hal yang masih perlu diputuskan |

Referensi visual: [`docs/assets/design-reference.jpg`](docs/assets/design-reference.jpg).
Dokumen requirement asli: [`docs/assets/spesifikasi-fungsional-v1.pdf`](docs/assets/spesifikasi-fungsional-v1.pdf).

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 · Supabase (Postgres, Auth, Storage) ·
Web Push (PWA) · Recharts · Deploy di Vercel.

Penjadwalan otomatis memakai algoritma rule-based yang deterministik — tidak memanggil layanan LLM.
