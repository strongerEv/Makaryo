# Roadmap Pengembangan — 10 Sesi

Pekerjaan dipecah agar tiap sesi selesai utuh, di-commit, dan bisa dicek hasilnya.
Sesi berikutnya cukup membaca `CLAUDE.md` + dokumen di `docs/` — tidak perlu mengulang diskusi.

**Aturan tiap sesi:** baca dokumen fondasi → kerjakan hanya lingkup sesi ini → `npm run build`
hijau → commit → push → tandai sesi selesai di tabel bawah.

| Sesi | Fokus | Status |
|---|---|---|
| 0 | Fondasi dokumen, skema DB, design system | ✅ selesai |
| 1 | Scaffold, design system, layout responsif, autentikasi + verifikasi admin | ✅ selesai |
| 2 | Kelola pengguna (verifikasi, tambah, edit, hapus) + pengaturan shift | ✅ selesai |
| 3 | Absensi (clock in/out, selfie, GPS, riwayat) | ✅ selesai |
| 4 | Jadwal & kalender (host + admin, publish) | ✅ selesai |
| 5 | Generator jadwal otomatis + review draft | ✅ selesai |
| 6 | Pengajuan izin & libur, approval, audit log | ✅ selesai |
| 7 | Laporan omzet + export PDF/Excel + chart | ✅ selesai |
| 8 | PWA, push notification, cron reminder, dashboard admin | ✅ selesai |
| 9 | Poles desktop, responsif, dan QA menyeluruh | ✅ selesai |

---

## Sesi 1 — Fondasi aplikasi & autentikasi ✅

**Lingkup**
- Scaffold Next.js 15 (App Router, TypeScript strict) + Tailwind v4 + struktur direktori sesuai `CLAUDE.md`.
- Klien Supabase (browser, server, admin) + middleware sesi. `.env.example` diisi lengkap.
- Migrasi `0001`: `profiles` (termasuk `account_status`), fungsi `is_admin()` & `is_active_user()`,
  trigger pembuatan profil, trigger penjaga kolom istimewa, tabel `audit_logs`, kebijakan RLS.
- Token design system diterjemahkan ke Tailwind + komponen `ui/` inti.
- `AppShell` responsif: bottom nav di mobile, sidebar di desktop.
- Halaman login, daftar mandiri, lupa password, reset password, dan **halaman tunggu verifikasi**
  yang memeriksa status secara berkala.
- Penjaga rute berbasis peran **dan status akun**; pengalihan ke beranda host atau dashboard admin.
- Beranda placeholder untuk kedua peran memakai kartu modul berwarna sesuai referensi.

**Selesai bila:** pendaftar baru mendarat di halaman tunggu, admin bisa menyetujuinya, dan
sesudah disetujui pengguna otomatis masuk ke beranda. Build hijau, nav benar di 360px dan 1440px.

## Sesi 2 — Kelola pengguna & pengaturan shift ✅

**Lingkup**
- Migrasi `0002`: `shifts`, `app_settings`, seed 3 shift default (06.00–21.00) + baris setting.
- Admin — halaman **Kelola Pengguna**: daftar dengan pencarian & filter, tab antrian verifikasi
  dengan badge, setujui/tolak (alasan wajib saat menolak), tambah pengguna manual (host atau admin)
  lewat route handler dengan service role, edit data pribadi & kepegawaian, nonaktifkan,
  dan hapus permanen dengan konfirmasi (ditolak bila akun sudah punya riwayat).
- Halaman detail host: data pribadi, data kepegawaian, tempat statistik kehadiran (diisi sesi 3).
- Unggah foto profil ke Storage bucket `avatars`.
- Admin — **Pengaturan Shift**: tambah, edit, nonaktifkan (tidak menghapus), atur nama/jam/minimum host,
  toleransi telat, dan jam operasional.
- Host — halaman profil: lihat & ubah data pribadi terbatas, ganti kata sandi.
- Setiap aksi verifikasi, perubahan, dan penghapusan tercatat di `audit_logs`.

**Selesai bila:** admin bisa memverifikasi pendaftar, membuat akun host baru yang langsung bisa
login, mengedit dan menonaktifkannya, serta mengelola shift sepenuhnya.

## Sesi 3 — Absensi ✅

**Lingkup**
- Migrasi `0003`: `attendances` + RLS.
- Alur clock in/out: buka kamera (`getUserMedia`, kamera depan), ambil selfie, kompres,
  unggah ke bucket `attendance`, ambil koordinat GPS, kirim ke server action.
- Timestamp dan penentuan status dihitung **di server**: bandingkan `clock_in_at` dengan jam mulai
  shift terjadwal + toleransi telat → `on_time` / `late` + `late_minutes`.
- Absen tanpa jadwal tetap tercatat (assignment kosong) dan diberi penanda.
- Izin lokasi ditolak → tetap simpan, tandai "lokasi tidak tersedia".
- Riwayat absensi host (miliknya sendiri) dan monitor admin (semua host, filter tanggal & host),
  lengkap dengan pratinjau foto lewat signed URL.
- Statistik kehadiran & total jam kerja bulan berjalan mengisi halaman detail host dari sesi 2.

**Selesai bila:** siklus clock in → clock out lengkap dengan foto, lokasi, dan status yang benar,
terlihat di riwayat host maupun monitor admin.

## Sesi 4 — Jadwal & kalender ✅

**Lingkup**
- Migrasi `0004`: `schedule_periods`, `schedule_assignments` + RLS (host hanya melihat `published`).
- Host: kalender harian, mingguan, bulanan; tiap hari menampilkan shift + jam atau tanda libur.
- Admin: kalender gabungan seluruh host; assign host ke shift per tanggal; edit dan hapus assignment;
  validasi anti-bentrok rentang jam.
- Tombol Publish per periode: mengubah status draft → published (pemicu notifikasi menyusul di sesi 8;
  untuk sekarang cukup buat entri `notifications`).
- Beranda host menampilkan shift hari ini dari jadwal yang sudah dipublish, dan
  menghubungkannya ke tombol Clock In dari sesi 3.

**Selesai bila:** admin bisa menyusun dan mem-publish jadwal secara manual, dan host melihatnya
di ketiga tampilan kalender.

## Sesi 5 — Generator jadwal otomatis ✅

**Lingkup**
- `lib/scheduling/` — mesin rule-based murni, tanpa efek samping, mudah diuji:
  input (host aktif, shift aktif, rentang tanggal, izin & libur yang disetujui, jatah libur,
  riwayat beban kerja) → output (daftar assignment + daftar peringatan).
- Batasan keras: tidak menjadwalkan host nonaktif; tidak melanggar izin/libur yang disetujui;
  tidak ada bentrok jam; menghormati jatah libur mingguan.
- Batasan lunak: memenuhi minimum host per shift; meratakan jumlah shift antar host;
  menghindari pola shift yang melelahkan (mis. tutup malam lalu buka pagi).
- Shift yang kurang personel ditandai sebagai peringatan, tidak menggagalkan generate.
- UI admin: pilih periode → "Generate Draft Jadwal" → tinjau draft (geser/tukar host, dengan
  peringatan yang terlihat) → Publish.
- Unit test untuk mesin penjadwalan (kasus: bentrok, kuota libur habis, host kurang, distribusi merata).

**Selesai bila:** admin bisa membuat draft satu bulan penuh dalam sekali klik, mengeditnya,
dan mem-publish-nya, dengan seluruh batasan keras terpenuhi dan test hijau.

## Sesi 6 — Pengajuan izin & libur + audit log ✅

**Lingkup**
- Migrasi `0005` (`leave_requests`) dan bagian audit dari `0007` (`audit_logs`).
- Host: form libur mingguan (hanya muncul bila admin membuka toggle, untuk periode yang ditentukan)
  dan form izin mendadak (validasi H-3, alasan wajib), plus daftar status pengajuan miliknya.
- Admin: antrian approval dengan tab pending/disetujui/ditolak, aksi setujui/tolak + alasan,
  serta toggle buka/tutup periode pengajuan libur mingguan.
- Hasil approval menjadi masukan mesin penjadwalan sesi 5.
- Audit log: catat perubahan jadwal, approval/reject, revisi omzet, dan perubahan shift.
  Halaman "Riwayat Aktivitas" untuk admin dengan filter entitas, pelaku, dan tanggal.

**Selesai bila:** siklus ajukan → approve/reject → tercermin di generator jadwal berjalan penuh,
dan tiap aksi berdampak tercatat di audit log.

## Sesi 7 — Omzet, laporan & export ✅

**Lingkup**
- Migrasi `0006`: `revenue_reports` + RLS.
- Input omzet per shift oleh host maupun admin: nominal, foto bukti, shift, tanggal.
- Riwayat & rekap dengan filter per host, per shift, dan per periode.
- Revisi omzet setelah submit awal → tercatat di audit log.
- Chart tren omzet (Recharts) untuk admin.
- Export laporan absensi dan laporan omzet ke **PDF** dan **Excel**, dengan filter periode dan per host.

**Selesai bila:** kedua laporan bisa di-export dalam dua format dengan isi yang sesuai filter.

## Sesi 8 — PWA, notifikasi & dashboard admin ✅

**Lingkup**
- Manifest PWA + service worker + ikon; panduan install ke home screen (khusus iOS dijelaskan berbeda).
- Migrasi `0007` sisanya: `push_subscriptions`, `notifications`, `notification_deliveries`.
- Berlangganan Web Push (VAPID), permintaan izin dengan penjelasan sebelum prompt browser.
- Vercel Cron:
  - setiap 5 menit — kirim reminder H-1 jam, H-30 menit, H-15 menit (dicatat di
    `notification_deliveries` agar tidak dobel), dengan suara alarm & getar;
  - harian — tandai `absent` untuk assignment terpublish yang lewat tanpa clock in.
- Notifikasi kejadian: pengajuan baru → admin; approve/reject → host; jadwal dipublish → host terkait.
- Pusat notifikasi dalam aplikasi (lonceng + badge belum dibaca).
- Dashboard admin: ringkasan hari ini, kartu perlu tindakan, chart tren omzet 7 hari,
  chart kehadiran mingguan.

**Selesai bila:** aplikasi bisa di-install, notifikasi reminder benar-benar sampai di perangkat Android,
dan dashboard menampilkan data nyata.

## Sesi 9 — Poles & QA ✅

**Lingkup**
- Telusuri setiap halaman di 360px, 768px, dan 1440px; perbaiki yang meleset dari design system.
- Keadaan kosong, keadaan memuat (skeleton), dan penanganan error yang konsisten.
- Aksesibilitas: kontras, fokus keyboard, label form, `aria-live` untuk toast.
- Kinerja: ukuran gambar, muat malas kalender & tabel panjang.
- README: cara setup Supabase, variabel lingkungan, cara deploy ke Vercel, cara membuat akun admin pertama.
- Uji alur menyeluruh untuk kedua peran dan perbaiki temuannya.

**Selesai bila:** aplikasi siap dipakai operasional harian tanpa cacat yang menghalangi.

---

## Setelah roadmap ini

Seluruh sesi sudah selesai. Pekerjaan lanjutan yang masuk akal berikutnya:

- Integrasi payroll (nomor rekening dan total jam kerja sudah tersedia di data).
- Kebijakan penyimpanan foto absensi bila kuota Storage mulai menipis.
- Notifikasi ringkasan harian untuk admin.

Catat kebutuhan baru di `docs/99-open-questions.md` sebelum mulai membangun,
supaya keputusannya tetap terlacak seperti sesi-sesi sebelumnya.
