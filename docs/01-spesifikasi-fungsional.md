# Spesifikasi Fungsional

Sumber: dokumen "Spesifikasi Fungsional — Aplikasi Manajemen Karyawan Host Live Streaming v1.0".
Dokumen ini adalah versi kerja yang dipakai selama pengembangan.

## Ringkasan platform

| Aspek | Keputusan |
|---|---|
| Platform | Web App (PWA), diakses lewat browser, disarankan di-install ke home screen |
| Role | Admin (1 level) & User/Host |
| Notifikasi | Web Push via PWA, disertai suara alarm & getar |
| Validasi absensi | Foto selfie + GPS, **tanpa** radius geofencing |
| Mesin penjadwalan | Sistem membuat draft jadwal, admin review & publish manual |
| Perangkat | Host umumnya pakai HP, Admin umumnya pakai laptop/desktop |

---

## 1. Autentikasi & manajemen pengguna

- Login email + password, dua role: Admin dan Host.
- Akun host dibuat oleh admin. Tidak ada self-register.
- Admin hanya satu level, tidak ada super admin.
- Reset password (lupa password) tersedia untuk kedua role.
- Setelah login, pengguna diarahkan ke beranda sesuai rolenya.

## 2. Data master karyawan (host)

**Data pribadi:** nama lengkap, foto profil, nomor HP aktif (kontak darurat), email (untuk login),
alamat domisili, tanggal lahir.

**Data kepegawaian:** tanggal join, status (Aktif / Nonaktif / Cuti panjang),
nomor rekening (opsional, untuk payroll ke depan),
jatah libur mingguan (default 1x/minggu, bisa di-override per orang oleh admin).

**Data otomatis dari sistem:** total jam kerja bulan berjalan, statistik kehadiran
(tepat waktu / telat / tidak absen).

## 3. Modul absensi (clock in / clock out)

- Host clock in saat mulai shift dan clock out saat shift berakhir.
- Wajib mengambil foto selfie saat absen sebagai bukti kehadiran.
- Lokasi GPS dicatat otomatis saat absen. **Tidak ada validasi radius.**
  Kalau perangkat menolak izin lokasi, absen tetap tersimpan dengan lokasi kosong dan diberi penanda.
- Timestamp memakai **waktu server**, bukan waktu perangkat.
- Riwayat absensi: host melihat miliknya sendiri, admin melihat semua host.
- Status otomatis dibandingkan jadwal shift: **Tepat waktu / Telat / Tidak absen**.
  Ambang telat dapat diatur admin (default 0 menit toleransi).

## 4. Modul jadwal & kalender

**Host:** melihat jadwal dalam tampilan harian, mingguan, dan bulanan; tiap hari menampilkan
shift aktif lengkap dengan jamnya, atau tanda hari libur.

**Admin:** mengatur, mengedit, dan mem-publish jadwal lewat tampilan kalender;
assign host ke shift tertentu per tanggal; melihat jadwal seluruh host dalam satu kalender gabungan.

Jadwal punya dua status: **draft** (hanya terlihat admin) dan **published** (terlihat host,
memicu notifikasi).

## 5. Modul penjadwalan otomatis

Sistem membuat draft jadwal mingguan hingga bulanan secara otomatis. Admin tetap review dan
boleh mengedit manual sebelum publish.

**Faktor yang diperhitungkan:**
- Jatah libur mingguan tiap host (default 1x/minggu, atau override admin).
- Pengajuan izin mendadak yang sudah disetujui.
- Pengajuan libur mingguan yang sudah disetujui.
- Jumlah host minimum yang dibutuhkan per shift.
- Distribusi beban kerja yang merata antar host.
- Anti-bentrok: satu host tidak boleh dijadwalkan di dua shift pada waktu bersamaan.
- Hanya host berstatus **Aktif** yang dijadwalkan.

**Alur kerja:**
1. Admin memilih periode (minggu/bulan), klik "Generate Draft Jadwal".
2. Sistem menghasilkan draft dari data host aktif, kuota libur, dan izin yang disetujui.
3. Admin meninjau draft, bisa menggeser atau menukar host antar shift secara manual.
4. Admin klik "Publish" — jadwal final terlihat seluruh host dan memicu notifikasi.

Kalau ada shift yang tidak terpenuhi jumlah minimum host-nya, draft tetap dibuat dan
shift tersebut ditandai kurang personel agar admin bisa memutuskan.

## 6. Modul pengajuan izin & libur

### A. Request libur mingguan
- Host mengajukan jatah libur mingguannya untuk periode satu bulan ke depan.
- Fitur ini punya toggle on/off oleh admin — dibuka hanya saat admin sedang menyusun jadwal
  bulan berikutnya.
- Pengajuan masuk antrian approval admin.
- Yang disetujui menjadi input bagi mesin penjadwalan.

### B. Izin mendadak (tidak masuk kerja)
- Terpisah dari libur mingguan, untuk kebutuhan mendesak di luar jatah libur rutin.
- Wajib diajukan minimal **H-3** sebelum tanggal izin.
- Wajib mencantumkan alasan.
- Approval oleh admin; status (pending / disetujui / ditolak) terlihat oleh host,
  disertai alasan bila ditolak.

## 7. Modul notifikasi & alarm

Pengingat jam kerja dikirim otomatis pada **H-1 jam, H-30 menit, dan H-15 menit** sebelum
shift dimulai — pop-up notifikasi disertai suara alarm dan getar.

Notifikasi dua arah:

| Kejadian | Penerima |
|---|---|
| Host mengajukan izin/libur | Admin (badge pengajuan baru) |
| Admin menyetujui/menolak pengajuan | Host bersangkutan (+ alasan bila ditolak) |
| Jadwal baru dipublish | Seluruh host dalam jadwal tersebut |
| Reminder jam kerja (H-1j / H-30m / H-15m) | Host bersangkutan |

Catatan teknis: notifikasi lewat PWA + Web Push. Host diarahkan meng-install aplikasi ke
home screen saat pertama kali pakai. Push di iOS/Safari lebih terbatas dibanding Android —
aplikasi harus menampilkan panduan install dan status izin notifikasi secara jelas.

## 8. Modul laporan omzet

- Input laporan omzet per shift, bisa oleh host maupun admin.
- Data: nominal omzet, foto bukti, shift terkait, waktu input.
- Riwayat & rekap dapat difilter per host, per shift, dan per periode.
- Revisi setelah submit awal dicatat di audit log.

## 9. Modul pengaturan shift (admin)

- Default 3 shift dalam rentang operasional 06.00–21.00; pembagian jamnya diatur admin saat setup awal.
- Tombol tambah (+) untuk shift custom baru — jumlah shift tidak dibatasi.
- Tiap shift punya: nama, jam mulai, jam selesai, jumlah host minimum.
- Shift dapat diedit atau **dinonaktifkan** — tidak pernah dihapus permanen, agar riwayat
  jadwal lama tetap valid.

## 10. Modul laporan & export (admin)

**Laporan absensi:** export PDF dan Excel; filter periode (harian/mingguan/bulanan) dan per host.

**Laporan omzet:** export PDF dan Excel; dilengkapi chart tren omzet; filter periode dan per host.

## 11. Dashboard admin

**Ringkasan hari ini:** jumlah host yang sedang shift sekarang dari total shift hari ini;
status kehadiran real-time (siapa sudah clock in, siapa belum/telat); total omzet hari ini.

**Perlu tindakan:** jumlah pengajuan pending approval; draft jadwal yang belum direview/dipublish.

**Grafik ringkas:** tren omzet 7 hari terakhir; tingkat kehadiran mingguan.

## 12. Audit log / riwayat aktivitas

Dicatat hanya untuk aktivitas yang berdampak ke jadwal, absensi, dan omzet — bukan seluruh aktivitas.

- Perubahan jadwal: siapa mengedit, jadwal milik siapa, kapan, dan perubahan dari-ke apa.
- Approval/reject pengajuan izin & libur: oleh siapa dan kapan.
- Revisi data omzet setelah submit awal.
- Perubahan pengaturan shift.

Diakses admin lewat halaman terpisah "Riwayat Aktivitas".

---

## Peta halaman

### Host (mobile-first)
| Halaman | Isi |
|---|---|
| Beranda | Sapaan + shift hari ini, tombol besar Clock In/Out, ringkasan jam kerja bulan ini, pintasan modul |
| Absen | Kamera selfie, indikator GPS, konfirmasi clock in/out |
| Riwayat Absensi | Daftar per tanggal + status tepat waktu/telat |
| Jadwal | Kalender harian/mingguan/bulanan |
| Pengajuan | Form libur mingguan (bila dibuka admin) & izin mendadak, plus status pengajuan |
| Omzet | Form input omzet per shift + riwayat milik sendiri |
| Profil | Data diri, status izin notifikasi, panduan install PWA, logout |

### Admin (desktop-first, tetap jalan di mobile)
| Halaman | Isi |
|---|---|
| Dashboard | Ringkasan hari ini, kartu perlu tindakan, dua chart ringkas |
| Karyawan | Tabel host, tambah/edit, detail statistik per host |
| Jadwal | Kalender gabungan, editor assign, generate draft, publish |
| Approval | Antrian pengajuan izin & libur, toggle buka/tutup periode pengajuan |
| Absensi | Monitor kehadiran seluruh host + filter |
| Omzet | Rekap & chart tren |
| Laporan | Export PDF/Excel absensi & omzet |
| Pengaturan Shift | Kelola shift, jam, minimum host, toleransi telat |
| Riwayat Aktivitas | Audit log |

---

## Hal yang belum diputuskan

Dilacak di `docs/99-open-questions.md`.
