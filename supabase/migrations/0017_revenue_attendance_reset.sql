-- Makaryo — 0017: hapus dan reset data omzet serta absensi.
--
-- Data simulasi menumpuk di dua tempat yang belum punya jalan keluar: laporan
-- omzet dan catatan absensi. Menghapusnya satu per satu lewat aplikasi terlalu
-- lambat, dan membaca seluruh barisnya dulu di lapisan aplikasi hanya untuk
-- menghapusnya kembali itu mahal sekaligus rawan — barisnya bisa berubah di
-- antara pembacaan dan penghapusan.
--
-- Empat fungsi di bawah ini melayani dua kebutuhan yang berbeda:
--   * *_month_counts — memberi tahu isi tiap bulan sebelum tombol ditekan,
--     supaya memilih bulan yang kebetulan kosong tidak terasa seperti fitur
--     yang rusak.
--   * reset_*_month  — menghapus satu rentang dalam satu perintah, lalu
--     mengembalikan apa yang benar-benar terhapus beserta path fotonya, agar
--     berkas di storage ikut dibereskan dan tidak jadi sampah.

-- ---------------------------------------------------------------- omzet ----

create or replace function public.revenue_month_counts(from_month date, to_month date)
returns table (month text, report_count integer, total_amount numeric)
language sql
stable
security definer
set search_path = public
as $$
  select
    to_char(r.work_date, 'YYYY-MM') as month,
    count(*)::integer               as report_count,
    coalesce(sum(r.amount), 0)      as total_amount
  from public.revenue_reports r
  where public.is_admin()
    and r.work_date >= from_month
    and r.work_date < (to_month + interval '1 month')
  group by 1
$$;

revoke all on function public.revenue_month_counts(date, date) from public;
grant execute on function public.revenue_month_counts(date, date) to authenticated;

create or replace function public.reset_revenue_month(
  period_start date,
  period_end date,
  target_host uuid default null
)
returns table (deleted_total integer, deleted_amount numeric, proof_paths text[])
language plpgsql
security definer
set search_path = public
as $$
declare
  hasil_total  integer := 0;
  hasil_jumlah numeric := 0;
  hasil_bukti  text[]  := '{}';
begin
  if not public.is_admin() then
    raise exception 'Hanya admin yang boleh mereset laporan omzet.';
  end if;

  with terhapus as (
    delete from public.revenue_reports r
    where r.work_date between period_start and period_end
      and (target_host is null or r.host_id = target_host)
    returning r.amount, r.proof_url
  )
  select
    count(*)::integer,
    coalesce(sum(amount), 0),
    coalesce(array_agg(proof_url) filter (where proof_url is not null), '{}')
  into hasil_total, hasil_jumlah, hasil_bukti
  from terhapus;

  return query select hasil_total, hasil_jumlah, hasil_bukti;
end;
$$;

revoke all on function public.reset_revenue_month(date, date, uuid) from public;
grant execute on function public.reset_revenue_month(date, date, uuid) to authenticated;

-- -------------------------------------------------------------- absensi ----

create or replace function public.attendance_month_counts(from_month date, to_month date)
returns table (month text, record_count integer)
language sql
stable
security definer
set search_path = public
as $$
  select
    to_char(a.work_date, 'YYYY-MM') as month,
    count(*)::integer               as record_count
  from public.attendances a
  where public.is_admin()
    and a.work_date >= from_month
    and a.work_date < (to_month + interval '1 month')
  group by 1
$$;

revoke all on function public.attendance_month_counts(date, date) from public;
grant execute on function public.attendance_month_counts(date, date) to authenticated;

create or replace function public.reset_attendance_month(
  period_start date,
  period_end date,
  target_host uuid default null
)
returns table (deleted_total integer, photo_paths text[])
language plpgsql
security definer
set search_path = public
as $$
declare
  hasil_total integer := 0;
  hasil_foto  text[]  := '{}';
begin
  if not public.is_admin() then
    raise exception 'Hanya admin yang boleh mereset data absensi.';
  end if;

  -- Satu baris absensi menyimpan dua foto, jadi keduanya dikumpulkan sebelum
  -- barisnya hilang; setelah itu path-nya tidak bisa ditemukan lagi.
  with terhapus as (
    delete from public.attendances a
    where a.work_date between period_start and period_end
      and (target_host is null or a.host_id = target_host)
    returning a.clock_in_photo, a.clock_out_photo
  )
  select
    count(*)::integer,
    coalesce(
      array_remove(array_agg(clock_in_photo) || array_agg(clock_out_photo), null),
      '{}'
    )
  into hasil_total, hasil_foto
  from terhapus;

  return query select hasil_total, hasil_foto;
end;
$$;

revoke all on function public.reset_attendance_month(date, date, uuid) from public;
grant execute on function public.reset_attendance_month(date, date, uuid) to authenticated;
