# Hal yang Masih Perlu Diputuskan

Catat di sini setiap kali menemukan hal yang belum ditentukan. Jangan menghentikan pekerjaan
karenanya — pilih asumsi paling wajar, tulis asumsinya, dan lanjutkan.

| # | Pertanyaan | Asumsi sementara | Perlu diputuskan sebelum |
|---|---|---|---|
| 1 | Host lupa clock out — bagaimana perlakuannya? | Sistem menutup otomatis di jam berakhirnya shift dan menandai "clock out otomatis"; admin bisa mengoreksi manual (tercatat di audit log). | Sesi 3 |
| 2 | Host lupa clock in tapi terbukti kerja | Admin bisa membuat absensi manual untuk host, tercatat di audit log sebagai entri admin. | Sesi 3 |
| 3 | Penamaan shift custom | Bebas diisi admin, ditambah urutan tampil. Tanpa skema penomoran otomatis. | Sesi 2 |
| 4 | Integrasi payroll | Belum ada. Nomor rekening dan total jam kerja sudah disiapkan agar mudah ditambahkan nanti. | — |
| 5 | Berapa lama foto absensi disimpan? | Disimpan tanpa batas waktu untuk sekarang. Kalau kuota storage jadi masalah, tambahkan kebijakan hapus otomatis (mis. 6 bulan). | Sesi 9 |
| 6 | Apakah host boleh melihat omzet host lain? | Tidak. Host hanya melihat omzet miliknya sendiri. | Sesi 7 |
| 7 | Shift yang melewati tengah malam | Didukung skema (`end_time <= start_time` berarti selesai keesokan hari), tapi di luar rentang operasional 06.00–21.00 saat ini. | Sesi 4 |
