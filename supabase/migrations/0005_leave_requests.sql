-- Makaryo — 0005: pengajuan libur mingguan dan izin mendadak.

create type leave_type as enum ('weekly_off', 'urgent');
create type leave_status as enum ('pending', 'approved', 'rejected');

create table public.leave_requests (
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

create index leave_requests_status_idx on public.leave_requests (status, requested_date);
create index leave_requests_host_idx on public.leave_requests (host_id, requested_date desc);

alter table public.leave_requests enable row level security;

create policy "host membaca pengajuannya sendiri"
  on public.leave_requests for select
  using (host_id = auth.uid() and public.is_active_user());

create policy "host membuat pengajuannya sendiri"
  on public.leave_requests for insert
  with check (host_id = auth.uid() and public.is_active_user() and status = 'pending');

-- Host boleh membatalkan pengajuan yang masih pending.
create policy "host menghapus pengajuan pending"
  on public.leave_requests for delete
  using (host_id = auth.uid() and status = 'pending' and public.is_active_user());

create policy "admin mengelola pengajuan"
  on public.leave_requests for all
  using (public.is_admin())
  with check (public.is_admin());
