-- Makaryo — 0009: kuota libur mingguan per tanggal.
--
-- Satu tanggal hanya boleh diambil sejumlah host tertentu (bawaan: satu orang),
-- supaya pengajuan libur tidak menumpuk di tanggal yang sama dan shift hari itu
-- tetap terisi.

alter table public.app_settings
  add column if not exists weekly_off_quota_per_date smallint not null default 1
    check (weekly_off_quota_per_date between 1 and 20);

comment on column public.app_settings.weekly_off_quota_per_date is
  'Berapa host yang boleh mengambil libur mingguan pada tanggal yang sama.';

-- Host tidak boleh membaca pengajuan milik host lain, padahal ia perlu tahu
-- tanggal mana yang sudah penuh. Fungsi ini hanya membuka jumlahnya, bukan
-- identitas pengajunya.
create or replace function public.weekly_off_availability(period_start date, period_end date)
returns table (requested_date date, taken integer, mine boolean)
language sql
stable
security definer
set search_path = public
as $$
  select
    l.requested_date,
    count(*)::integer as taken,
    bool_or(l.host_id = auth.uid()) as mine
  from public.leave_requests l
  where l.type = 'weekly_off'
    and l.status in ('pending', 'approved')
    and l.requested_date between period_start and period_end
  group by l.requested_date
$$;

revoke all on function public.weekly_off_availability(date, date) from public;
grant execute on function public.weekly_off_availability(date, date) to authenticated;
