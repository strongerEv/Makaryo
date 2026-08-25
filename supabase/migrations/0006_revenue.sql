-- Makaryo — 0006: laporan omzet per shift.

create table public.revenue_reports (
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

create index revenue_reports_date_idx on public.revenue_reports (work_date desc);
create index revenue_reports_host_idx on public.revenue_reports (host_id, work_date desc);

create trigger revenue_reports_set_updated_at
  before update on public.revenue_reports
  for each row execute function public.set_updated_at();

alter table public.revenue_reports enable row level security;

create policy "host membaca omzetnya sendiri"
  on public.revenue_reports for select
  using (host_id = auth.uid() and public.is_active_user());

create policy "host melaporkan omzetnya sendiri"
  on public.revenue_reports for insert
  with check (host_id = auth.uid() and public.is_active_user());

create policy "host memperbarui omzetnya sendiri"
  on public.revenue_reports for update
  using (host_id = auth.uid() and public.is_active_user())
  with check (host_id = auth.uid());

create policy "admin mengelola omzet"
  on public.revenue_reports for all
  using (public.is_admin())
  with check (public.is_admin());

insert into storage.buckets (id, name, public)
values ('revenue', 'revenue', false)
on conflict (id) do nothing;

create policy "bukti omzet dibaca pemilik dan admin"
  on storage.objects for select
  using (
    bucket_id = 'revenue'
    and (public.is_admin() or (storage.foldername(name))[1] = auth.uid()::text)
  );

create policy "bukti omzet diunggah pemilik atau admin"
  on storage.objects for insert
  with check (
    bucket_id = 'revenue'
    and (public.is_admin() or (storage.foldername(name))[1] = auth.uid()::text)
  );

create policy "bukti omzet dihapus admin"
  on storage.objects for delete
  using (bucket_id = 'revenue' and public.is_admin());
