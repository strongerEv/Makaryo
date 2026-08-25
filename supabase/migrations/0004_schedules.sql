-- Makaryo — 0004: periode jadwal dan penugasan shift.

create type schedule_status as enum ('draft', 'published', 'cancelled');

create table public.schedule_periods (
  id           uuid primary key default gen_random_uuid(),
  start_date   date not null,
  end_date     date not null,
  status       schedule_status not null default 'draft',
  generated_at timestamptz,
  published_at timestamptz,
  published_by uuid references public.profiles (id) on delete set null,
  warnings     jsonb,
  created_at   timestamptz not null default now(),
  check (end_date >= start_date),
  unique (start_date, end_date)
);

create index schedule_periods_range_idx on public.schedule_periods (start_date, end_date);

create table public.schedule_assignments (
  id         uuid primary key default gen_random_uuid(),
  period_id  uuid references public.schedule_periods (id) on delete set null,
  host_id    uuid not null references public.profiles (id) on delete cascade,
  shift_id   uuid not null references public.shifts (id) on delete restrict,
  work_date  date not null,
  status     schedule_status not null default 'draft',
  source     text not null default 'manual' check (source in ('auto', 'manual')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (host_id, shift_id, work_date)
);

create index schedule_assignments_date_idx on public.schedule_assignments (work_date);
create index schedule_assignments_host_idx on public.schedule_assignments (host_id, work_date);
create index schedule_assignments_period_idx on public.schedule_assignments (period_id);

create trigger schedule_assignments_set_updated_at
  before update on public.schedule_assignments
  for each row execute function public.set_updated_at();

alter table public.attendances
  add constraint attendances_assignment_fkey
  foreign key (assignment_id) references public.schedule_assignments (id) on delete set null;

alter table public.schedule_periods     enable row level security;
alter table public.schedule_assignments enable row level security;

create policy "admin mengelola periode jadwal"
  on public.schedule_periods for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "host membaca periode terpublish"
  on public.schedule_periods for select
  using (status = 'published' and public.is_active_user());

-- Host hanya melihat penugasan miliknya yang sudah dipublish.
create policy "host membaca jadwalnya sendiri"
  on public.schedule_assignments for select
  using (host_id = auth.uid() and status = 'published' and public.is_active_user());

create policy "admin mengelola penugasan"
  on public.schedule_assignments for all
  using (public.is_admin())
  with check (public.is_admin());
