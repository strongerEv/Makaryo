-- Makaryo — 0010: sinkron otomatis lewat Supabase Realtime.
--
-- Sebelum ini publikasi `supabase_realtime` kosong, jadi tidak ada satu pun
-- perubahan tabel yang sampai ke browser — data baru hanya muncul setelah
-- halaman di-refresh manual. Tabel di bawah didaftarkan supaya klien bisa
-- berlangganan `postgres_changes` dan menyegarkan tampilannya sendiri.
--
-- Row Level Security tetap berlaku: tiap pelanggan hanya menerima baris yang
-- boleh ia baca. Host hanya dapat kabar soal datanya sendiri, admin dapat semua.

do $$
declare
  nama_tabel text;
begin
  foreach nama_tabel in array array[
    'attendances',
    'schedule_assignments',
    'revenue_reports',
    'leave_requests',
    'notifications',
    'profiles'
  ]
  loop
    -- `replica identity full` membuat baris lama ikut terkirim, sehingga RLS
    -- masih bisa dievaluasi untuk kejadian UPDATE dan DELETE. Tanpa ini,
    -- penghapusan data tidak pernah sampai ke host yang berhak melihatnya.
    execute format('alter table public.%I replica identity full', nama_tabel);

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = nama_tabel
    ) then
      execute format('alter publication supabase_realtime add table public.%I', nama_tabel);
    end if;
  end loop;
end
$$;
