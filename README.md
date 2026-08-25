# Makaryo

Aplikasi web (PWA) untuk mengelola operasional karyawan host live streaming — absensi berfoto
dan berlokasi, penjadwalan shift otomatis, pengajuan izin dan libur, pengingat jam kerja,
pelaporan omzet, serta laporan administratif.

Dua peran: **Admin** (satu level, mengelola semuanya) dan **Host** (melihat dan mengisi datanya sendiri).

## Fitur

**Untuk host**
- Beranda: shift hari ini, tombol clock in, ringkasan jam kerja dan omzet bulan berjalan
- Absensi: selfie lewat kamera depan, lokasi GPS, status tepat waktu/telat otomatis, riwayat bulanan
- Jadwal: tampilan bulanan, mingguan, dan harian dari jadwal yang sudah dipublish
- Pengajuan: libur mingguan (saat dibuka admin) dan izin mendadak dengan aturan H-3
- Omzet: input nominal per shift beserta foto bukti, plus riwayat dan revisi
- Profil: data diri, ganti kata sandi, pengaturan notifikasi, panduan pasang aplikasi

**Untuk admin**
- Dashboard: kehadiran hari ini, daftar tindakan yang perlu diambil, tren omzet dan kedisiplinan 7 hari
- Kelola pengguna: verifikasi pendaftar, tambah manual, edit, nonaktifkan, hapus
- Jadwal: kalender gabungan, penyusunan manual, generate draft otomatis, publish
- Approval: antrian izin & libur, buka/tutup periode pengajuan libur mingguan
- Absensi: monitor kehadiran, foto & lokasi, catat manual, koreksi jam
- Omzet: rekap, tren harian, input atas nama host
- Laporan: export absensi dan omzet ke PDF maupun Excel
- Pengaturan shift dan riwayat aktivitas (audit log)

## Menjalankan secara lokal

### 1. Siapkan proyek Supabase

Buat proyek baru di [supabase.com](https://supabase.com), lalu siapkan databasenya lewat
**SQL Editor**. Ada dua cara:

- **Sekali jalan** — salin seluruh isi `supabase/setup-lengkap.sql`, tempel, klik Run.
- **Satu per satu** — jalankan `supabase/migrations/*.sql` **berurutan** dari 0001 sampai 0007
  (atau `supabase db push` bila memakai Supabase CLI).

Migrasi membuat seluruh tabel, kebijakan RLS, tiga shift bawaan 06.00–21.00, serta bucket
Storage `avatars`, `attendance`, dan `revenue` (semuanya privat, diakses lewat signed URL).

### 2. Isi environment

```bash
cp .env.example .env.local
```

| Variabel | Keterangan |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL proyek Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Kunci publik (anon) |
| `SUPABASE_SERVICE_ROLE_KEY` | Kunci service role — **hanya dipakai di server**, jangan di-commit |
| `NEXT_PUBLIC_SITE_URL` | URL aplikasi, untuk tautan reset kata sandi |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Kunci Web Push, buat dengan `npx web-push generate-vapid-keys` |
| `VAPID_SUBJECT` | Email kontak, format `mailto:...` |
| `CRON_SECRET` | Token pelindung route cron |

Tanpa kunci VAPID aplikasi tetap berjalan — notifikasi hanya tersimpan di dalam aplikasi
dan tidak dikirim sebagai push ke perangkat.

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

## Deploy ke Vercel

1. Hubungkan repositori ini ke Vercel, isi seluruh environment variable di atas.
2. `vercel.json` sudah mendaftarkan dua cron:
   - `/api/cron/reminders` tiap 5 menit — pengingat H-1 jam, H-30 menit, H-15 menit
   - `/api/cron/daily` pukul 16.00 UTC (23.00 WIB) — menutup absensi yang lupa clock out
     dan menandai host yang tidak absen
3. Set `CRON_SECRET` di Vercel; kedua route menolak permintaan tanpa token tersebut.
4. Tambahkan URL produksi ke Supabase → Authentication → URL Configuration agar tautan
   reset kata sandi mengarah ke domain yang benar.

## Perintah

```bash
npm run dev        # server pengembangan
npm run build      # wajib hijau sebelum commit
npm run lint
npm run typecheck
npm run test       # unit test mesin penjadwalan & perhitungan absensi
```

## Catatan teknis

- Zona waktu operasional Asia/Jakarta. Semua timestamp disimpan UTC dan dikonversi ke WIB
  hanya di lapisan tampilan.
- Shift yang jam selesainya lebih kecil dari jam mulai dianggap berakhir keesokan hari.
- Penjadwalan otomatis memakai algoritma rule-based deterministik di `lib/scheduling/` —
  tidak memanggil layanan LLM, jadi hasilnya konsisten dan tanpa biaya per generate.
- Web Push memakai suara notifikasi bawaan sistem; yang bisa diatur aplikasi hanyalah pola
  getar dan sifat notifikasi. Push di iOS baru berfungsi setelah aplikasi dipasang ke home screen.

## Dokumentasi

| Dokumen | Isi |
|---|---|
| [`CLAUDE.md`](CLAUDE.md) | Panduan kerja, stack, struktur direktori, konvensi |
| [`docs/01-spesifikasi-fungsional.md`](docs/01-spesifikasi-fungsional.md) | Seluruh kebutuhan fungsional & peta halaman |
| [`docs/02-database.md`](docs/02-database.md) | Skema tabel, relasi, dan aturan RLS |
| [`docs/03-design-system.md`](docs/03-design-system.md) | Token warna, tipografi, komponen, aturan responsif |
| [`docs/04-roadmap-sesi.md`](docs/04-roadmap-sesi.md) | Pembagian pekerjaan menjadi 10 sesi |
| [`docs/99-open-questions.md`](docs/99-open-questions.md) | Keputusan yang tertunda dan asumsinya |

Referensi visual: [`docs/assets/design-reference.jpg`](docs/assets/design-reference.jpg).
Dokumen requirement asli: [`docs/assets/spesifikasi-fungsional-v1.pdf`](docs/assets/spesifikasi-fungsional-v1.pdf).

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 · Supabase (Postgres, Auth, Storage) ·
Web Push (PWA) · Recharts · exceljs · @react-pdf/renderer · Vitest · Deploy di Vercel.
