-- =====================================================================
-- Makaryo — penjadwal pengingat jam kerja
--
-- Paket gratis Vercel hanya mengizinkan cron berjalan sekali sehari,
-- sedangkan pengingat shift perlu dicek setiap beberapa menit. Berkas ini
-- memindahkan pemicunya ke Supabase, yang bisa menjalankan tugas berkala
-- tanpa biaya tambahan.
--
-- SEBELUM MENJALANKAN:
--   1. Aktifkan dua ekstensi di Database → Extensions: pg_cron dan pg_net
--   2. Ganti dua nilai di bawah ini:
--        - GANTI_ALAMAT_APLIKASI  → alamat Vercel kamu, tanpa garis miring di akhir
--        - GANTI_CRON_SECRET      → nilai CRON_SECRET yang dipasang di Vercel
-- =====================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Hapus jadwal lama bila berkas ini dijalankan ulang.
select cron.unschedule('makaryo-pengingat-shift')
where exists (select 1 from cron.job where jobname = 'makaryo-pengingat-shift');

select cron.schedule(
  'makaryo-pengingat-shift',
  '*/5 * * * *',
  $job$
    select net.http_get(
      url := 'https://GANTI_ALAMAT_APLIKASI/api/cron/reminders',
      headers := jsonb_build_object('Authorization', 'Bearer GANTI_CRON_SECRET')
    );
  $job$
);

-- ---------------------------------------------------------------------
-- Memeriksa hasilnya
-- ---------------------------------------------------------------------
-- Jadwal yang terpasang:
--   select jobname, schedule, active from cron.job;
--
-- Sepuluh percobaan terakhir (status 'succeeded' berarti panggilan terkirim).
-- Riwayat hanya menyimpan jobid, jadi namanya diambil lewat tabel cron.job:
--   select d.start_time, d.status, d.return_message
--   from cron.job_run_details d
--   join cron.job j on j.jobid = d.jobid
--   where j.jobname = 'makaryo-pengingat-shift'
--   order by d.start_time desc
--   limit 10;
--
-- Balasan dari aplikasi (harus berisi {"ok":true,...}):
--   select created, status_code, content
--   from net._http_response
--   order by created desc
--   limit 5;
--
-- Menghentikan pengingat:
--   select cron.unschedule('makaryo-pengingat-shift');
-- =====================================================================
