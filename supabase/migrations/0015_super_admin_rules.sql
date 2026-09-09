-- Makaryo — 0015: aturan super admin.
--
-- Super admin adalah admin dengan satu kewenangan tambahan: mengubah peran
-- pengguna. Admin biasa tetap bisa menambah dan mengelola host seperti biasa,
-- tetapi tidak bisa mengangkat siapa pun menjadi admin — termasuk dirinya.

-- is_admin() dipakai hampir seluruh kebijakan RLS. Super admin harus ikut lolos
-- di sana, jadi cukup diperluas — bukan diganti — supaya semua aturan lama tetap
-- berlaku tanpa disentuh satu per satu.
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
      and p.role in ('admin', 'super_admin')
      and p.account_status = 'active'
  );
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'super_admin'
      and p.account_status = 'active'
  );
$$;

-- Penjaga kolom istimewa: peran kini punya aturan sendiri yang lebih ketat
-- daripada kolom lainnya.
create or replace function public.profiles_guard_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- auth.uid() kosong berarti pemanggilnya service role (server action admin)
  -- atau SQL langsung dari dashboard — keduanya dipercaya. Pembatasan peran
  -- untuk jalur itu ditegakkan di server action, lihat requireSuperAdmin.
  if auth.uid() is null then
    return new;
  end if;

  if public.is_admin() then
    -- Hanya super admin yang boleh menggeser peran.
    if new.role is distinct from old.role and not public.is_super_admin() then
      new.role := old.role;
    end if;
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
