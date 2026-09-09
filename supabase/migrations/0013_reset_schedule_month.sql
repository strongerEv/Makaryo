-- Makaryo — 0013: penghapusan jadwal satu bulan dalam satu perintah.
--
-- Versi sebelumnya membaca dulu seluruh id penugasan lalu menghapusnya lewat
-- filter `id in (...)`. Selain merakit URL panjang berisi puluhan uuid, cara itu
-- menyisakan celah: baris bisa berubah di antara pembacaan dan penghapusan.
--
-- Fungsi ini menghapus langsung berdasarkan rentang tanggal, lalu mengembalikan
-- apa yang benar-benar terhapus — jadi lapisan aplikasi tidak perlu menebak
-- hasilnya, dan angkanya bisa ditampilkan apa adanya ke admin.

create or replace function public.reset_schedule_month(
  period_start date,
  period_end date,
  only_draft boolean default true
)
returns table (deleted_total integer, deleted_published integer, host_ids uuid[])
language plpgsql
security definer
set search_path = public
as $$
declare
  hasil_total integer := 0;
  hasil_terbit integer := 0;
  hasil_host uuid[] := '{}';
begin
  if not public.is_admin() then
    raise exception 'Hanya admin yang boleh mereset jadwal.';
  end if;

  with terhapus as (
    delete from public.schedule_assignments sa
    where sa.work_date between period_start and period_end
      and (not only_draft or sa.status = 'draft')
    returning sa.host_id, sa.status
  )
  select
    count(*)::integer,
    count(*) filter (where status = 'published')::integer,
    coalesce(array_agg(distinct host_id) filter (where status = 'published'), '{}')
  into hasil_total, hasil_terbit, hasil_host
  from terhapus;

  -- Periode dikembalikan ke draft hanya bila tidak ada lagi jadwal terbit
  -- tersisa di dalamnya.
  if not exists (
    select 1 from public.schedule_assignments
    where work_date between period_start and period_end and status = 'published'
  ) then
    update public.schedule_periods
    set status = 'draft', published_at = null, published_by = null
    where start_date = period_start and end_date = period_end;
  end if;

  return query select hasil_total, hasil_terbit, hasil_host;
end;
$$;

revoke all on function public.reset_schedule_month(date, date, boolean) from public;
grant execute on function public.reset_schedule_month(date, date, boolean) to authenticated;
