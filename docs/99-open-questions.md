# Hal yang Masih Perlu Diputuskan

Catat di sini setiap kali menemukan hal yang belum ditentukan. Jangan menghentikan pekerjaan
karenanya — pilih asumsi paling wajar, tulis asumsinya, dan lanjutkan.

| # | Pertanyaan | Asumsi sementara | Perlu diputuskan sebelum |
|---|---|---|---|
| 1 | ~~Host lupa clock out~~ **Diputuskan** | Cron harian menutup otomatis di jam berakhirnya shift (jeda 2 jam), ditandai "ditutup otomatis", dan admin bisa mengoreksi lewat dialog Koreksi. | Selesai di Sesi 8 |
| 2 | ~~Host lupa clock in tapi terbukti kerja~~ **Diputuskan** | Admin memakai tombol "Catat manual" di halaman Absensi; entri tercatat di audit log. | Selesai di Sesi 3 |
| 3 | ~~Penamaan shift custom~~ **Diputuskan** | Nama bebas diisi admin, plus urutan tampil dan warna. Tanpa penomoran otomatis. | Selesai di Sesi 2 |
| 4 | Integrasi payroll | Belum ada. Nomor rekening dan total jam kerja sudah disiapkan agar mudah ditambahkan nanti. | — |
| 5 | Berapa lama foto absensi disimpan? | Disimpan tanpa batas waktu untuk sekarang. Kalau kuota storage jadi masalah, tambahkan kebijakan hapus otomatis (mis. 6 bulan). | Sesi 9 |
| 6 | ~~Host melihat omzet host lain?~~ **Diputuskan** | Tidak. RLS membatasi host hanya pada omzet miliknya sendiri. | Selesai di Sesi 7 |
| 7 | ~~Shift melewati tengah malam~~ **Diputuskan** | Didukung penuh: `end_time <= start_time` berarti selesai keesokan hari, dipakai konsisten oleh absensi, penjadwalan, dan cron. | Selesai di Sesi 5 |
| 8 | Apakah pendaftaran mandiri perlu dibatasi (mis. hanya email domain tertentu)? | Terbuka untuk siapa saja, tetapi tidak ada akses sebelum admin menyetujui. | Sesi 9 |
| 9 | Admin pertama dibuat bagaimana? | Lewat SQL sekali di Supabase (lihat README). Sesudah itu admin bisa dibuat dari halaman Kelola Pengguna. | — |
| 10 | Suara alarm khusus untuk pengingat shift | Web Push memakai suara notifikasi bawaan sistem — tidak bisa diganti dari web. Yang bisa dikendalikan hanya pola getar (dipakai pola panjang khusus reminder) dan `requireInteraction` agar notifikasi tidak hilang sendiri. | — |
| 11 | Retensi data notifikasi & audit log | Belum ada pembersihan otomatis. Tambahkan bila tabelnya sudah membengkak. | Saat volume data naik |
| 12 | Penjadwal pengingat tiap 5 menit | Paket gratis Vercel hanya mengizinkan cron sekali sehari, jadi pemicu pengingat dipindahkan ke pg_cron milik Supabase. Bisa dikembalikan ke Vercel bila nanti berlangganan Pro. | Selesai — lihat `docs/06-pengingat-shift.md` |
