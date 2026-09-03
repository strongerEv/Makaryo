-- =====================================================================
-- Makaryo — setup database sekali jalan
--
-- Gabungan seluruh berkas di supabase/migrations/ dalam urutan yang benar.
-- Salin SELURUH isi berkas ini, tempel ke Supabase SQL Editor, lalu klik Run.
--
-- Berkas ini AMAN dijalankan berulang kali: bagian yang sudah ada dilewati,
-- bagian yang belum ada dibuatkan. Jadi bila sebelumnya gagal di tengah jalan,
-- cukup jalankan ulang berkas ini.
--
-- Dihasilkan oleh scripts/build-setup-sql.mjs — jangan diubah manual.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0001_init_profiles_and_auth.sql
-- ---------------------------------------------------------------------

-- Makaryo — 0001: profil pengguna, peran, status akun, audit log, dan RLS.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- enum

do $guard$ begin
  create type user_role as enum ('admin', 'host');
exception when duplicate_object then null;
end $guard$;

do $guard$ begin
  create type account_status as enum ('pending', 'active', 'rejected', 'suspended');
exception when duplicate_object then null;
end $guard$;

do $guard$ begin
  create type employment_status as enum ('active', 'inactive', 'long_leave');
exception when duplicate_object then null;
end $guard$;

-- ---------------------------------------------------------------- profiles

create table if not exists public.profiles (
  id                   uuid primary key references auth.users (id) on delete cascade,
  role                 user_role         not null default 'host',
  account_status       account_status    not null default 'pending',
  account_note         text,
  reviewed_by          uuid references public.profiles (id) on delete set null,
  reviewed_at          timestamptz,

  full_name            text              not null,
  email                text              not null,
  phone                text,
  avatar_url           text,
  address              text,
  birth_date           date,

  join_date            date,
  employment_status    employment_status not null default 'active',
  bank_account         text,
  weekly_day_off_quota smallint          not null default 1
                       check (weekly_day_off_quota between 0 and 7),

  created_at           timestamptz       not null default now(),
  updated_at           timestamptz       not null default now()
);

create index if not exists profiles_role_idx on public.profiles (role);

create index if not exists profiles_account_status_idx on public.profiles (account_status);

create index if not exists profiles_employment_status_idx on public.profiles (employment_status);

-- ---------------------------------------------------------------- audit log

create table if not exists public.audit_logs (
  id             uuid primary key default gen_random_uuid(),
  actor_id       uuid references public.profiles (id) on delete set null,
  entity         text not null,
  entity_id      uuid,
  action         text not null,
  target_user_id uuid references public.profiles (id) on delete set null,
  before         jsonb,
  after          jsonb,
  created_at     timestamptz not null default now()
);

create index if not exists audit_logs_created_at_idx on public.audit_logs (created_at desc);

create index if not exists audit_logs_entity_idx on public.audit_logs (entity, entity_id);

-- ---------------------------------------------------------------- helper

-- Ditandai security definer agar kebijakan RLS bisa membaca profiles tanpa rekursi.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
      and p.account_status = 'active'
  );
$$;

create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.account_status = 'active'
  );
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------- pendaftaran mandiri

-- Pendaftar lewat halaman /daftar selalu masuk sebagai host berstatus pending.
-- Akun yang dibuat admin memakai service role dan menimpa status ini menjadi active.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, phone, role, account_status)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(new.email, '@', 1)),
    new.email,
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    'host',
    'pending'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------- penjaga kolom istimewa

-- Host boleh memperbarui profilnya sendiri, tetapi tidak boleh menaikkan peran,
-- mengubah status akun, atau menyentuh data kepegawaian.
create or replace function public.profiles_guard_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- auth.uid() kosong berarti pemanggilnya service role (server action admin)
  -- atau SQL langsung dari dashboard — keduanya dipercaya.
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;

  new.role              := old.role;
  new.account_status    := old.account_status;
  new.account_note      := old.account_note;
  new.reviewed_by       := old.reviewed_by;
  new.reviewed_at       := old.reviewed_at;
  new.employment_status := old.employment_status;
  new.join_date         := old.join_date;
  new.weekly_day_off_quota := old.weekly_day_off_quota;
  new.email             := old.email;
  return new;
end;
$$;

drop trigger if exists profiles_guard_privileged_columns on public.profiles;

create trigger profiles_guard_privileged_columns
  before update on public.profiles
  for each row execute function public.profiles_guard_privileged_columns();

-- ---------------------------------------------------------------- RLS

alter table public.profiles   enable row level security;

alter table public.audit_logs enable row level security;

drop policy if exists "profil sendiri dapat dibaca" on public.profiles;

create policy "profil sendiri dapat dibaca"
  on public.profiles for select
  using (id = auth.uid());

drop policy if exists "admin membaca semua profil" on public.profiles;

create policy "admin membaca semua profil"
  on public.profiles for select
  using (public.is_admin());

drop policy if exists "profil sendiri dapat diubah" on public.profiles;

create policy "profil sendiri dapat diubah"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "admin mengubah semua profil" on public.profiles;

create policy "admin mengubah semua profil"
  on public.profiles for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "admin menghapus profil" on public.profiles;

create policy "admin menghapus profil"
  on public.profiles for delete
  using (public.is_admin() and id <> auth.uid());

drop policy if exists "admin membaca audit log" on public.audit_logs;

create policy "admin membaca audit log"
  on public.audit_logs for select
  using (public.is_admin());

-- Penulisan audit log dilakukan server memakai service role, jadi tidak ada
-- kebijakan insert untuk pengguna biasa.

-- ---------------------------------------------------------------- storage

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', false)
on conflict (id) do nothing;

drop policy if exists "avatar dapat dibaca pemilik dan admin" on storage.objects;

create policy "avatar dapat dibaca pemilik dan admin"
  on storage.objects for select
  using (
    bucket_id = 'avatars'
    and (public.is_admin() or (storage.foldername(name))[1] = auth.uid()::text)
  );

drop policy if exists "avatar diunggah pemilik atau admin" on storage.objects;

create policy "avatar diunggah pemilik atau admin"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and (public.is_admin() or (storage.foldername(name))[1] = auth.uid()::text)
  );

drop policy if exists "avatar diperbarui pemilik atau admin" on storage.objects;

create policy "avatar diperbarui pemilik atau admin"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and (public.is_admin() or (storage.foldername(name))[1] = auth.uid()::text)
  );

drop policy if exists "avatar dihapus pemilik atau admin" on storage.objects;

create policy "avatar dihapus pemilik atau admin"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and (public.is_admin() or (storage.foldername(name))[1] = auth.uid()::text)
  );

-- ---------------------------------------------------------------------
-- 0002_shifts_and_settings.sql
-- ---------------------------------------------------------------------

-- Makaryo — 0002: master shift dan pengaturan aplikasi.

create table if not exists public.shifts (
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

create index if not exists shifts_active_idx on public.shifts (is_active, sort_order);

drop trigger if exists shifts_set_updated_at on public.shifts;

create trigger shifts_set_updated_at
  before update on public.shifts
  for each row execute function public.set_updated_at();

-- Satu baris berisi pengaturan global. Dikunci pada id = 1.
create table if not exists public.app_settings (
  id                        smallint primary key default 1 check (id = 1),
  weekly_off_request_open   boolean     not null default false,
  weekly_off_request_period date,
  late_tolerance_minutes    smallint    not null default 0 check (late_tolerance_minutes >= 0),
  operational_start         time        not null default '06:00',
  operational_end           time        not null default '21:00',
  updated_at                timestamptz not null default now()
);

drop trigger if exists app_settings_set_updated_at on public.app_settings;

create trigger app_settings_set_updated_at
  before update on public.app_settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------- RLS

alter table public.shifts       enable row level security;

alter table public.app_settings enable row level security;

drop policy if exists "shift dibaca pengguna aktif" on public.shifts;

create policy "shift dibaca pengguna aktif"
  on public.shifts for select
  using (public.is_active_user());

drop policy if exists "admin mengelola shift" on public.shifts;

create policy "admin mengelola shift"
  on public.shifts for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "pengaturan dibaca pengguna aktif" on public.app_settings;

create policy "pengaturan dibaca pengguna aktif"
  on public.app_settings for select
  using (public.is_active_user());

drop policy if exists "admin mengubah pengaturan" on public.app_settings;

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

-- ---------------------------------------------------------------------
-- 0003_attendances.sql
-- ---------------------------------------------------------------------

-- Makaryo — 0003: absensi clock in / clock out.

do $guard$ begin
  create type attendance_status as enum ('on_time', 'late', 'absent');
exception when duplicate_object then null;
end $guard$;

create table if not exists public.attendances (
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

create unique index if not exists attendances_host_date_assignment_idx
  on public.attendances (host_id, work_date, coalesce(assignment_id, '00000000-0000-0000-0000-000000000000'::uuid));

create index if not exists attendances_work_date_idx on public.attendances (work_date desc);

create index if not exists attendances_host_idx on public.attendances (host_id, work_date desc);

drop trigger if exists attendances_set_updated_at on public.attendances;

create trigger attendances_set_updated_at
  before update on public.attendances
  for each row execute function public.set_updated_at();

alter table public.attendances enable row level security;

drop policy if exists "host membaca absensinya sendiri" on public.attendances;

create policy "host membaca absensinya sendiri"
  on public.attendances for select
  using (host_id = auth.uid() and public.is_active_user());

drop policy if exists "host mencatat absensinya sendiri" on public.attendances;

create policy "host mencatat absensinya sendiri"
  on public.attendances for insert
  with check (host_id = auth.uid() and public.is_active_user());

drop policy if exists "host memperbarui absensinya sendiri" on public.attendances;

create policy "host memperbarui absensinya sendiri"
  on public.attendances for update
  using (host_id = auth.uid() and public.is_active_user())
  with check (host_id = auth.uid());

drop policy if exists "admin mengelola semua absensi" on public.attendances;

create policy "admin mengelola semua absensi"
  on public.attendances for all
  using (public.is_admin())
  with check (public.is_admin());

-- Bucket foto absensi (privat, diakses lewat signed URL).
insert into storage.buckets (id, name, public)
values ('attendance', 'attendance', false)
on conflict (id) do nothing;

drop policy if exists "foto absensi dibaca pemilik dan admin" on storage.objects;

create policy "foto absensi dibaca pemilik dan admin"
  on storage.objects for select
  using (
    bucket_id = 'attendance'
    and (public.is_admin() or (storage.foldername(name))[1] = auth.uid()::text)
  );

drop policy if exists "foto absensi diunggah pemilik atau admin" on storage.objects;

create policy "foto absensi diunggah pemilik atau admin"
  on storage.objects for insert
  with check (
    bucket_id = 'attendance'
    and (public.is_admin() or (storage.foldername(name))[1] = auth.uid()::text)
  );

drop policy if exists "foto absensi dihapus admin" on storage.objects;

create policy "foto absensi dihapus admin"
  on storage.objects for delete
  using (bucket_id = 'attendance' and public.is_admin());

-- ---------------------------------------------------------------------
-- 0004_schedules.sql
-- ---------------------------------------------------------------------

-- Makaryo — 0004: periode jadwal dan penugasan shift.

do $guard$ begin
  create type schedule_status as enum ('draft', 'published', 'cancelled');
exception when duplicate_object then null;
end $guard$;

create table if not exists public.schedule_periods (
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

create index if not exists schedule_periods_range_idx on public.schedule_periods (start_date, end_date);

create table if not exists public.schedule_assignments (
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

create index if not exists schedule_assignments_date_idx on public.schedule_assignments (work_date);

create index if not exists schedule_assignments_host_idx on public.schedule_assignments (host_id, work_date);

create index if not exists schedule_assignments_period_idx on public.schedule_assignments (period_id);

drop trigger if exists schedule_assignments_set_updated_at on public.schedule_assignments;

create trigger schedule_assignments_set_updated_at
  before update on public.schedule_assignments
  for each row execute function public.set_updated_at();

alter table public.attendances drop constraint if exists attendances_assignment_fkey;

alter table public.attendances
  add constraint attendances_assignment_fkey
  foreign key (assignment_id) references public.schedule_assignments (id) on delete set null;

alter table public.schedule_periods     enable row level security;

alter table public.schedule_assignments enable row level security;

drop policy if exists "admin mengelola periode jadwal" on public.schedule_periods;

create policy "admin mengelola periode jadwal"
  on public.schedule_periods for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "host membaca periode terpublish" on public.schedule_periods;

create policy "host membaca periode terpublish"
  on public.schedule_periods for select
  using (status = 'published' and public.is_active_user());

-- Host hanya melihat penugasan miliknya yang sudah dipublish.
drop policy if exists "host membaca jadwalnya sendiri" on public.schedule_assignments;

create policy "host membaca jadwalnya sendiri"
  on public.schedule_assignments for select
  using (host_id = auth.uid() and status = 'published' and public.is_active_user());

drop policy if exists "admin mengelola penugasan" on public.schedule_assignments;

create policy "admin mengelola penugasan"
  on public.schedule_assignments for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------
-- 0005_leave_requests.sql
-- ---------------------------------------------------------------------

-- Makaryo — 0005: pengajuan libur mingguan dan izin mendadak.

do $guard$ begin
  create type leave_type as enum ('weekly_off', 'urgent');
exception when duplicate_object then null;
end $guard$;

do $guard$ begin
  create type leave_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null;
end $guard$;

create table if not exists public.leave_requests (
  id             uuid primary key default gen_random_uuid(),
  host_id        uuid not null references public.profiles (id) on delete cascade,
  type           leave_type not null,
  requested_date date not null,
  reason         text,
  status         leave_status not null default 'pending',
  reviewed_by    uuid references public.profiles (id) on delete set null,
  reviewed_at    timestamptz,
  review_note    text,
  created_at     timestamptz not null default now(),
  unique (host_id, type, requested_date)
);

create index if not exists leave_requests_status_idx on public.leave_requests (status, requested_date);

create index if not exists leave_requests_host_idx on public.leave_requests (host_id, requested_date desc);

alter table public.leave_requests enable row level security;

drop policy if exists "host membaca pengajuannya sendiri" on public.leave_requests;

create policy "host membaca pengajuannya sendiri"
  on public.leave_requests for select
  using (host_id = auth.uid() and public.is_active_user());

drop policy if exists "host membuat pengajuannya sendiri" on public.leave_requests;

create policy "host membuat pengajuannya sendiri"
  on public.leave_requests for insert
  with check (host_id = auth.uid() and public.is_active_user() and status = 'pending');

-- Host boleh membatalkan pengajuan yang masih pending.
drop policy if exists "host menghapus pengajuan pending" on public.leave_requests;

create policy "host menghapus pengajuan pending"
  on public.leave_requests for delete
  using (host_id = auth.uid() and status = 'pending' and public.is_active_user());

drop policy if exists "admin mengelola pengajuan" on public.leave_requests;

create policy "admin mengelola pengajuan"
  on public.leave_requests for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------
-- 0006_revenue.sql
-- ---------------------------------------------------------------------

-- Makaryo — 0006: laporan omzet per shift.

create table if not exists public.revenue_reports (
  id           uuid primary key default gen_random_uuid(),
  host_id      uuid not null references public.profiles (id) on delete cascade,
  shift_id     uuid references public.shifts (id) on delete set null,
  work_date    date not null,
  amount       numeric(14, 2) not null check (amount >= 0),
  proof_url    text,
  note         text,
  submitted_by uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists revenue_reports_date_idx on public.revenue_reports (work_date desc);

create index if not exists revenue_reports_host_idx on public.revenue_reports (host_id, work_date desc);

drop trigger if exists revenue_reports_set_updated_at on public.revenue_reports;

create trigger revenue_reports_set_updated_at
  before update on public.revenue_reports
  for each row execute function public.set_updated_at();

alter table public.revenue_reports enable row level security;

drop policy if exists "host membaca omzetnya sendiri" on public.revenue_reports;

create policy "host membaca omzetnya sendiri"
  on public.revenue_reports for select
  using (host_id = auth.uid() and public.is_active_user());

drop policy if exists "host melaporkan omzetnya sendiri" on public.revenue_reports;

create policy "host melaporkan omzetnya sendiri"
  on public.revenue_reports for insert
  with check (host_id = auth.uid() and public.is_active_user());

drop policy if exists "host memperbarui omzetnya sendiri" on public.revenue_reports;

create policy "host memperbarui omzetnya sendiri"
  on public.revenue_reports for update
  using (host_id = auth.uid() and public.is_active_user())
  with check (host_id = auth.uid());

drop policy if exists "admin mengelola omzet" on public.revenue_reports;

create policy "admin mengelola omzet"
  on public.revenue_reports for all
  using (public.is_admin())
  with check (public.is_admin());

insert into storage.buckets (id, name, public)
values ('revenue', 'revenue', false)
on conflict (id) do nothing;

drop policy if exists "bukti omzet dibaca pemilik dan admin" on storage.objects;

create policy "bukti omzet dibaca pemilik dan admin"
  on storage.objects for select
  using (
    bucket_id = 'revenue'
    and (public.is_admin() or (storage.foldername(name))[1] = auth.uid()::text)
  );

drop policy if exists "bukti omzet diunggah pemilik atau admin" on storage.objects;

create policy "bukti omzet diunggah pemilik atau admin"
  on storage.objects for insert
  with check (
    bucket_id = 'revenue'
    and (public.is_admin() or (storage.foldername(name))[1] = auth.uid()::text)
  );

drop policy if exists "bukti omzet dihapus admin" on storage.objects;

create policy "bukti omzet dihapus admin"
  on storage.objects for delete
  using (bucket_id = 'revenue' and public.is_admin());

-- ---------------------------------------------------------------------
-- 0007_notifications.sql
-- ---------------------------------------------------------------------

-- Makaryo — 0007: langganan web push, pusat notifikasi, dan penanda pengiriman.

create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);

create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  type       text not null,
  title      text not null,
  body       text,
  link       text,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);

create index if not exists notifications_unread_idx on public.notifications (user_id) where read_at is null;

-- Menjaga agar satu pengingat hanya terkirim sekali per penugasan.
create table if not exists public.notification_deliveries (
  id             uuid primary key default gen_random_uuid(),
  assignment_id  uuid not null references public.schedule_assignments (id) on delete cascade,
  offset_minutes smallint not null,
  sent_at        timestamptz not null default now(),
  unique (assignment_id, offset_minutes)
);

alter table public.push_subscriptions      enable row level security;

alter table public.notifications           enable row level security;

alter table public.notification_deliveries enable row level security;

drop policy if exists "langganan push milik sendiri" on public.push_subscriptions;

create policy "langganan push milik sendiri"
  on public.push_subscriptions for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "notifikasi milik sendiri dibaca" on public.notifications;

create policy "notifikasi milik sendiri dibaca"
  on public.notifications for select
  using (user_id = auth.uid());

drop policy if exists "notifikasi milik sendiri ditandai terbaca" on public.notifications;

create policy "notifikasi milik sendiri ditandai terbaca"
  on public.notifications for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "admin membaca penanda pengiriman" on public.notification_deliveries;

create policy "admin membaca penanda pengiriman"
  on public.notification_deliveries for select
  using (public.is_admin());

-- ---------------------------------------------------------------------
-- 0008_demo_data.sql
-- ---------------------------------------------------------------------

-- Makaryo — 0008: penanda data contoh.
--
-- Data simulasi ditandai di tingkat pengguna. Menghapus penggunanya otomatis
-- menghapus seluruh absensi, jadwal, omzet, dan pengajuan miliknya lewat
-- foreign key on delete cascade, sehingga fitur reset tidak pernah menyentuh
-- data asli.

alter table public.profiles
  add column if not exists is_demo boolean not null default false;

create index if not exists profiles_is_demo_idx on public.profiles (is_demo) where is_demo;

comment on column public.profiles.is_demo is
  'Ditandai true untuk akun yang dibuat fitur data contoh; dipakai saat reset.';

-- ---------------------------------------------------------------------
-- 0009_weekly_off_availability.sql
-- ---------------------------------------------------------------------

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


-- =====================================================================
-- Selesai. Yang seharusnya terbentuk:
--   • 12 tabel (profiles, shifts, app_settings, attendances, schedule_periods,
--     schedule_assignments, leave_requests, revenue_reports, audit_logs,
--     push_subscriptions, notifications, notification_deliveries)
--   • 3 shift bawaan pukul 06.00-21.00 di tabel shifts
--   • 3 bucket Storage privat: avatars, attendance, revenue
--
-- Langkah berikutnya: daftar lewat halaman /daftar aplikasi, lalu jadikan
-- akun itu admin dengan menjalankan perintah berikut (ganti emailnya):
--
--   update public.profiles
--   set role = 'admin', account_status = 'active'
--   where email = 'email-kamu@contoh.com';
-- =====================================================================
