-- Makaryo — 0002: master shift dan pengaturan aplikasi.

create table public.shifts (
  id          uuid primary key default gen_random_uuid(),
  name        text     not null,
  start_time  time     not null,
  end_time    time     not null,
  min_hosts   smallint not null default 1 check (min_hosts >= 0),
  color       text     not null default 'primary',
  sort_order  smallint not null default 0,
  is_active   boolean  not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index shifts_active_idx on public.shifts (is_active, sort_order);

create trigger shifts_set_updated_at
  before update on public.shifts
  for each row execute function public.set_updated_at();

-- Satu baris berisi pengaturan global. Dikunci pada id = 1.
create table public.app_settings (
  id                        smallint primary key default 1 check (id = 1),
  weekly_off_request_open   boolean     not null default false,
  weekly_off_request_period date,
  late_tolerance_minutes    smallint    not null default 0 check (late_tolerance_minutes >= 0),
  operational_start         time        not null default '06:00',
  operational_end           time        not null default '21:00',
  updated_at                timestamptz not null default now()
);

create trigger app_settings_set_updated_at
  before update on public.app_settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------- RLS

alter table public.shifts       enable row level security;
alter table public.app_settings enable row level security;

create policy "shift dibaca pengguna aktif"
  on public.shifts for select
  using (public.is_active_user());

create policy "admin mengelola shift"
  on public.shifts for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "pengaturan dibaca pengguna aktif"
  on public.app_settings for select
  using (public.is_active_user());

create policy "admin mengubah pengaturan"
  on public.app_settings for update
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------- seed

insert into public.app_settings (id) values (1) on conflict (id) do nothing;

-- Tiga shift bawaan dalam rentang operasional 06.00–21.00. Jamnya boleh diubah admin.
-- Hanya diisi saat tabel masih kosong, agar migrasi aman dijalankan ulang.
insert into public.shifts (name, start_time, end_time, min_hosts, color, sort_order)
select *
from (values
  ('Shift Pagi',  time '06:00', time '11:00', 1, 'amber',   1),
  ('Shift Siang', time '11:00', time '16:00', 1, 'primary', 2),
  ('Shift Sore',  time '16:00', time '21:00', 1, 'coral',   3)
) as seed(name, start_time, end_time, min_hosts, color, sort_order)
where not exists (select 1 from public.shifts);
