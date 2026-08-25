-- Makaryo — 0001: profil pengguna, peran, status akun, audit log, dan RLS.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- enum

create type user_role as enum ('admin', 'host');
create type account_status as enum ('pending', 'active', 'rejected', 'suspended');
create type employment_status as enum ('active', 'inactive', 'long_leave');

-- ---------------------------------------------------------------- profiles

create table public.profiles (
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

create index profiles_role_idx on public.profiles (role);
create index profiles_account_status_idx on public.profiles (account_status);
create index profiles_employment_status_idx on public.profiles (employment_status);

-- ---------------------------------------------------------------- audit log

create table public.audit_logs (
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

create index audit_logs_created_at_idx on public.audit_logs (created_at desc);
create index audit_logs_entity_idx on public.audit_logs (entity, entity_id);

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

create trigger profiles_guard_privileged_columns
  before update on public.profiles
  for each row execute function public.profiles_guard_privileged_columns();

-- ---------------------------------------------------------------- RLS

alter table public.profiles   enable row level security;
alter table public.audit_logs enable row level security;

create policy "profil sendiri dapat dibaca"
  on public.profiles for select
  using (id = auth.uid());

create policy "admin membaca semua profil"
  on public.profiles for select
  using (public.is_admin());

create policy "profil sendiri dapat diubah"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "admin mengubah semua profil"
  on public.profiles for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "admin menghapus profil"
  on public.profiles for delete
  using (public.is_admin() and id <> auth.uid());

create policy "admin membaca audit log"
  on public.audit_logs for select
  using (public.is_admin());

-- Penulisan audit log dilakukan server memakai service role, jadi tidak ada
-- kebijakan insert untuk pengguna biasa.

-- ---------------------------------------------------------------- storage

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', false)
on conflict (id) do nothing;

create policy "avatar dapat dibaca pemilik dan admin"
  on storage.objects for select
  using (
    bucket_id = 'avatars'
    and (public.is_admin() or (storage.foldername(name))[1] = auth.uid()::text)
  );

create policy "avatar diunggah pemilik atau admin"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and (public.is_admin() or (storage.foldername(name))[1] = auth.uid()::text)
  );

create policy "avatar diperbarui pemilik atau admin"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and (public.is_admin() or (storage.foldername(name))[1] = auth.uid()::text)
  );

create policy "avatar dihapus pemilik atau admin"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and (public.is_admin() or (storage.foldername(name))[1] = auth.uid()::text)
  );
