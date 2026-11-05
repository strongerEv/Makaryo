-- Makaryo — 0018: Simulasi Jadwal (Beta).
--
-- Ruang coba-coba penjadwalan multi lini bisnis (mis. Tumbler & Celana) untuk
-- admin. Seluruh isinya — lini, shift tiruan, peserta, penugasan, izin, aturan
-- — disimpan sebagai satu dokumen JSON. Tidak ada relasi ke tabel jadwal,
-- shift, atau absensi yang asli, sehingga apa pun yang diubah di sini tidak
-- pernah terlihat oleh host dan tidak memengaruhi operasional.
--
-- Satu baris saja (id = 1): admin bekerja di satu simulasi bersama.

create table public.schedule_sandboxes (
  id          smallint primary key default 1 check (id = 1),
  data        jsonb       not null default '{}'::jsonb,
  updated_by  uuid        references public.profiles (id) on delete set null,
  updated_at  timestamptz not null default now()
);

create trigger schedule_sandboxes_set_updated_at
  before update on public.schedule_sandboxes
  for each row execute function public.set_updated_at();

alter table public.schedule_sandboxes enable row level security;

-- Hanya admin. Host tidak bisa membaca, apalagi mengubah.
create policy "admin mengelola simulasi jadwal"
  on public.schedule_sandboxes for all
  using (public.is_admin())
  with check (public.is_admin());
