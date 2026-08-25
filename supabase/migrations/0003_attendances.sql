-- Makaryo — 0003: absensi clock in / clock out.

create type attendance_status as enum ('on_time', 'late', 'absent');

create table public.attendances (
  id             uuid primary key default gen_random_uuid(),
  host_id        uuid not null references public.profiles (id) on delete cascade,
  assignment_id  uuid,
  work_date      date not null,

  clock_in_at    timestamptz,
  clock_in_photo text,
  clock_in_lat   numeric(10, 7),
  clock_in_lng   numeric(10, 7),

  clock_out_at    timestamptz,
  clock_out_photo text,
  clock_out_lat   numeric(10, 7),
  clock_out_lng   numeric(10, 7),

  status          attendance_status not null default 'on_time',
  late_minutes    integer not null default 0,
  worked_minutes  integer not null default 0,
  auto_closed     boolean not null default false,
  note            text,
  recorded_by     uuid references public.profiles (id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index attendances_host_date_assignment_idx
  on public.attendances (host_id, work_date, coalesce(assignment_id, '00000000-0000-0000-0000-000000000000'::uuid));

create index attendances_work_date_idx on public.attendances (work_date desc);
create index attendances_host_idx on public.attendances (host_id, work_date desc);

create trigger attendances_set_updated_at
  before update on public.attendances
  for each row execute function public.set_updated_at();

alter table public.attendances enable row level security;

create policy "host membaca absensinya sendiri"
  on public.attendances for select
  using (host_id = auth.uid() and public.is_active_user());

create policy "host mencatat absensinya sendiri"
  on public.attendances for insert
  with check (host_id = auth.uid() and public.is_active_user());

create policy "host memperbarui absensinya sendiri"
  on public.attendances for update
  using (host_id = auth.uid() and public.is_active_user())
  with check (host_id = auth.uid());

create policy "admin mengelola semua absensi"
  on public.attendances for all
  using (public.is_admin())
  with check (public.is_admin());

-- Bucket foto absensi (privat, diakses lewat signed URL).
insert into storage.buckets (id, name, public)
values ('attendance', 'attendance', false)
on conflict (id) do nothing;

create policy "foto absensi dibaca pemilik dan admin"
  on storage.objects for select
  using (
    bucket_id = 'attendance'
    and (public.is_admin() or (storage.foldername(name))[1] = auth.uid()::text)
  );

create policy "foto absensi diunggah pemilik atau admin"
  on storage.objects for insert
  with check (
    bucket_id = 'attendance'
    and (public.is_admin() or (storage.foldername(name))[1] = auth.uid()::text)
  );

create policy "foto absensi dihapus admin"
  on storage.objects for delete
  using (bucket_id = 'attendance' and public.is_admin());
