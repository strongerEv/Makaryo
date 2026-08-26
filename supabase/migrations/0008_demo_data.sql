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
