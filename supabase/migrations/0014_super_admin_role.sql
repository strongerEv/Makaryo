-- Makaryo — 0014: peran super admin.
--
-- Dipisah dari migrasi berikutnya karena nilai enum baru tidak boleh dipakai
-- pada transaksi yang sama dengan penambahannya.

alter type user_role add value if not exists 'super_admin';
