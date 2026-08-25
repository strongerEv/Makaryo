# HostFlow

Aplikasi web (PWA) untuk mengelola operasional karyawan host live streaming — absensi berfoto
dan berlokasi, penjadwalan shift otomatis, pengajuan izin dan libur, pengingat jam kerja,
pelaporan omzet, serta laporan administratif.

Dua peran: **Admin** (satu level, mengelola semuanya) dan **Host** (melihat dan mengisi datanya sendiri).

## Status

Tahap fondasi. Belum ada kode aplikasi — pengembangan berjalan bertahap sesuai
[`docs/04-roadmap-sesi.md`](docs/04-roadmap-sesi.md).

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

Next.js 15 · TypeScript · Tailwind CSS · Supabase (Postgres, Auth, Storage) · Web Push (PWA) ·
Recharts · Deploy di Vercel.

Penjadwalan otomatis memakai algoritma rule-based yang deterministik — tidak memanggil layanan LLM.
