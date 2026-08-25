# Penjadwal Pengingat Jam Kerja

Aplikasi punya dua tugas berkala:

| Tugas | Route | Seberapa sering | Dijalankan oleh |
|---|---|---|---|
| Pengingat H-1 jam, H-30 menit, H-15 menit | `/api/cron/reminders` | tiap 5 menit | Supabase (lihat di bawah) |
| Menutup absensi yang lupa clock out & menandai tidak absen | `/api/cron/daily` | sekali sehari, 23.00 WIB | Vercel Cron |

## Kenapa tidak keduanya di Vercel

Paket **Hobby (gratis)** Vercel membatasi cron menjadi **sekali sehari**. Jadwal `*/5 * * * *`
akan ditolak saat deploy. Karena itu `vercel.json` hanya memuat tugas harian, dan pemicu
pengingat dipindahkan ke luar Vercel.

Kalau nanti berlangganan Vercel Pro, tugas pengingat bisa dikembalikan ke `vercel.json`
dengan menambahkan `{ "path": "/api/cron/reminders", "schedule": "*/5 * * * *" }`, lalu
menghentikan penjadwal luar.

## Cara 1 — Supabase pg_cron (dianjurkan)

Tidak perlu akun baru, tidak ada biaya, dan berada satu atap dengan database.

1. Buka **Database → Extensions**, aktifkan **pg_cron** dan **pg_net**.
2. Buka **SQL Editor**, jalankan `supabase/pengingat-cron.sql` setelah mengganti dua nilai
   di dalamnya: alamat aplikasi dan `CRON_SECRET`.
3. Periksa hasilnya:

```sql
-- Jadwal yang terpasang
select jobname, schedule, active from cron.job;

-- Riwayat percobaannya. Tabel riwayat hanya menyimpan jobid,
-- jadi nama jadwalnya diambil lewat cron.job.
select d.start_time, d.status, d.return_message
from cron.job_run_details d
join cron.job j on j.jobid = d.jobid
where j.jobname = 'makaryo-pengingat-shift'
order by d.start_time desc
limit 5;
```

Status `succeeded` berarti panggilan terkirim. Untuk melihat balasan aplikasinya:

```sql
select created, status_code, content
from net._http_response
order by created desc
limit 5;
```

Balasan yang benar: `{"ok":true,"sent":0}` — angka `sent` hanya bertambah bila memang ada
shift yang mendekati jam mulai.

## Cara 2 — layanan cron gratis

Kalau lebih suka klik-klik daripada SQL, pakai layanan seperti **cron-job.org**:

- URL: `https://alamat-aplikasi-kamu/api/cron/reminders`
- Jadwal: setiap 5 menit
- Tambahkan header: `Authorization` bernilai `Bearer <CRON_SECRET>`

Hindari GitHub Actions untuk keperluan ini: jadwal tiap 5 menit pada repositori privat
menghabiskan kuota menit gratis dalam hitungan hari.

## Ketahanan terhadap jeda pemanggilan

Route pengingat tidak mengasumsikan jeda tertentu. Ia mencatat setiap tahap yang sudah
terlampaui di tabel `notification_deliveries`, lalu mengirim paling banyak satu notifikasi
per penugasan berisi sisa waktu yang sebenarnya.

Akibatnya:

- Dipanggil tiap 5 menit maupun tiap 15 menit sama-sama benar.
- Penjadwal yang sempat mati lalu hidup lagi tidak membuat pengingat hilang — host tetap
  menerima satu pesan dengan sisa waktu yang akurat saat itu.
- Satu tahap tidak pernah terkirim dua kali, berapa kali pun route-nya dipanggil.
