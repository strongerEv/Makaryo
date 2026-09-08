-- Makaryo — 0012: ringkasan jumlah penugasan per bulan.
--
-- Dialog reset jadwal perlu tahu isi tiap bulan sebelum admin menekan tombol.
-- Tanpa ini, satu-satunya cara mengetahuinya adalah mengunduh seluruh baris
-- penugasan beberapa bulan sekaligus — mahal, padahal yang dibutuhkan hanya
-- angkanya.

create or replace function public.schedule_month_counts(from_month date, to_month date)
returns table (month text, draft_count integer, published_count integer)
language sql
stable
security definer
set search_path = public
as $$
  select
    to_char(sa.work_date, 'YYYY-MM') as month,
    count(*) filter (where sa.status = 'draft')::integer     as draft_count,
    count(*) filter (where sa.status = 'published')::integer as published_count
  from public.schedule_assignments sa
  where public.is_admin()
    and sa.work_date >= from_month
    and sa.work_date < (to_month + interval '1 month')
  group by 1
$$;

revoke all on function public.schedule_month_counts(date, date) from public;
grant execute on function public.schedule_month_counts(date, date) to authenticated;
