-- Makaryo — 0016: absensi tidak lagi bentrok saat jadwalnya dihapus.
--
-- Menghapus penugasan membuat attendances.assignment_id di-null-kan (ON DELETE
-- SET NULL). Indeks lama:
--
--   unique (host_id, work_date, coalesce(assignment_id, '000...0'))
--
-- memakai satu nilai pengganti yang sama untuk semua baris tanpa jadwal. Jadi
-- begitu satu host punya dua absensi di hari yang sama — dua shift, hal yang
-- lumrah — dan jadwalnya dihapus bersamaan, keduanya jatuh ke kunci yang sama
-- dan Postgres menolaknya. Itu sebabnya menghapus satu penugasan bisa, tetapi
-- reset sebulan maupun hapus-banyak selalu gagal.
--
-- Sebenarnya ada dua aturan berbeda yang dulu dipaksa jadi satu indeks:
--
--   1. Satu penugasan hanya boleh punya satu catatan absensi.
--   2. Satu host hanya boleh punya satu absensi tanpa jadwal per hari.
--
-- Aturan kedua berlaku untuk absensi yang memang dibuat tanpa jadwal, bukan
-- untuk absensi yang kehilangan jadwalnya belakangan. Kolom was_scheduled
-- merekam keadaan saat baris dibuat, sehingga penghapusan jadwal tidak pernah
-- mengubah statusnya.

alter table public.attendances
  add column if not exists was_scheduled boolean not null default false;

comment on column public.attendances.was_scheduled is
  'Terkunci saat baris dibuat: apakah absensi ini berasal dari shift terjadwal. Tidak ikut berubah bila jadwalnya kemudian dihapus.';

-- Baris lama yang masih punya jadwal jelas berasal dari shift terjadwal.
update public.attendances set was_scheduled = true where assignment_id is not null;

create or replace function public.attendances_set_was_scheduled()
returns trigger
language plpgsql
as $$
begin
  new.was_scheduled := new.assignment_id is not null;
  return new;
end;
$$;

drop trigger if exists attendances_set_was_scheduled on public.attendances;
create trigger attendances_set_was_scheduled
  before insert on public.attendances
  for each row execute function public.attendances_set_was_scheduled();

drop index if exists public.attendances_host_date_assignment_idx;

-- Aturan 1. Baris yatim (assignment_id null) otomatis keluar dari indeks ini,
-- jadi berapa pun jumlahnya tidak pernah bertabrakan.
create unique index if not exists attendances_assignment_unique_idx
  on public.attendances (assignment_id)
  where assignment_id is not null;

-- Aturan 2. Hanya menjaga absensi yang sejak awal memang tanpa jadwal.
create unique index if not exists attendances_unscheduled_unique_idx
  on public.attendances (host_id, work_date)
  where assignment_id is null and not was_scheduled;
