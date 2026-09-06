-- Makaryo — 0011: jam istirahat pada shift, dan pengajuan tukar shift antar host.

-- ---------------------------------------------------------------------------
-- 1. Jam istirahat
-- ---------------------------------------------------------------------------
-- Jam live sebenarnya bukan sekadar selisih mulai dan selesai, karena di
-- tengahnya ada istirahat. Keduanya boleh kosong (shift tanpa istirahat), tapi
-- kalau diisi harus lengkap supaya durasinya bisa dihitung.

alter table public.shifts
  add column if not exists break_start time,
  add column if not exists break_end   time;

alter table public.shifts
  drop constraint if exists shifts_break_pair_check;

alter table public.shifts
  add constraint shifts_break_pair_check
  check (
    (break_start is null and break_end is null)
    or (break_start is not null and break_end is not null and break_end > break_start)
  );

comment on column public.shifts.break_start is 'Jam mulai istirahat; kosong berarti shift tanpa istirahat.';
comment on column public.shifts.break_end is 'Jam selesai istirahat; wajib diisi bila break_start terisi.';

-- ---------------------------------------------------------------------------
-- 2. Pengajuan tukar shift
-- ---------------------------------------------------------------------------
-- Host menukar satu penugasannya dengan penugasan milik host lain. Yang
-- disimpan adalah penugasannya, bukan sekadar tanggal, supaya saat disetujui
-- admin cukup menukar host_id pada dua baris itu.

create table if not exists public.shift_swap_requests (
  id                      uuid primary key default gen_random_uuid(),
  requester_id            uuid not null references public.profiles (id) on delete cascade,
  requester_assignment_id uuid not null references public.schedule_assignments (id) on delete cascade,
  target_id               uuid not null references public.profiles (id) on delete cascade,
  target_assignment_id    uuid not null references public.schedule_assignments (id) on delete cascade,
  reason                  text,
  status                  leave_status not null default 'pending',
  reviewed_by             uuid references public.profiles (id) on delete set null,
  reviewed_at             timestamptz,
  review_note             text,
  created_at              timestamptz not null default now(),
  check (requester_id <> target_id),
  check (requester_assignment_id <> target_assignment_id)
);

create index if not exists shift_swap_status_idx on public.shift_swap_requests (status, created_at desc);
create index if not exists shift_swap_requester_idx on public.shift_swap_requests (requester_id, created_at desc);
create index if not exists shift_swap_target_idx on public.shift_swap_requests (target_id, created_at desc);

-- Satu penugasan hanya boleh punya satu pengajuan yang masih menunggu, dari
-- sisi mana pun, supaya dua pengajuan tidak saling meniadakan saat disetujui.
create unique index if not exists shift_swap_pending_requester_idx
  on public.shift_swap_requests (requester_assignment_id)
  where status = 'pending';

create unique index if not exists shift_swap_pending_target_idx
  on public.shift_swap_requests (target_assignment_id)
  where status = 'pending';

alter table public.shift_swap_requests enable row level security;

-- Host yang diajak tukar juga perlu melihatnya, karena jadwalnya ikut berubah.
drop policy if exists "host membaca tukar shift miliknya" on public.shift_swap_requests;
create policy "host membaca tukar shift miliknya"
  on public.shift_swap_requests for select
  using ((requester_id = auth.uid() or target_id = auth.uid()) and public.is_active_user());

drop policy if exists "host mengajukan tukar shift" on public.shift_swap_requests;
create policy "host mengajukan tukar shift"
  on public.shift_swap_requests for insert
  with check (requester_id = auth.uid() and public.is_active_user() and status = 'pending');

drop policy if exists "host membatalkan tukar shift pending" on public.shift_swap_requests;
create policy "host membatalkan tukar shift pending"
  on public.shift_swap_requests for delete
  using (requester_id = auth.uid() and status = 'pending' and public.is_active_user());

drop policy if exists "admin mengelola tukar shift" on public.shift_swap_requests;
create policy "admin mengelola tukar shift"
  on public.shift_swap_requests for all
  using (public.is_admin())
  with check (public.is_admin());

-- Ikut disiarkan realtime supaya daftar approval dan jadwal langsung menyesuaikan.
do $$
begin
  execute 'alter table public.shift_swap_requests replica identity full';

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'shift_swap_requests'
  ) then
    execute 'alter publication supabase_realtime add table public.shift_swap_requests';
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- 3. Penukaran yang atomik
-- ---------------------------------------------------------------------------
-- Menukar host lewat dua UPDATE terpisah berisiko: bila yang kedua gagal, kedua
-- penugasan berakhir dimiliki orang yang sama. Satu pernyataan di dalam fungsi
-- ini menjamin keduanya berubah bersamaan atau tidak sama sekali.

create or replace function public.swap_assignment_hosts(
  first_assignment uuid,
  second_assignment uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  first_host  uuid;
  second_host uuid;
begin
  if not public.is_admin() then
    raise exception 'Hanya admin yang boleh menukar penugasan.';
  end if;

  select host_id into first_host  from public.schedule_assignments where id = first_assignment;
  select host_id into second_host from public.schedule_assignments where id = second_assignment;

  if first_host is null or second_host is null then
    raise exception 'Penugasan tidak ditemukan.';
  end if;

  update public.schedule_assignments
  set host_id = case id when first_assignment then second_host else first_host end,
      source  = 'manual'
  where id in (first_assignment, second_assignment);
end;
$$;

revoke all on function public.swap_assignment_hosts(uuid, uuid) from public;
grant execute on function public.swap_assignment_hosts(uuid, uuid) to authenticated;
