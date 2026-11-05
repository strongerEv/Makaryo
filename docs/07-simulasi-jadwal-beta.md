# Simulasi Jadwal (Beta)

Menu admin untuk mencoba penjadwalan **multi lini bisnis** sebelum diterapkan ke jadwal asli.
Lahir dari rencana menambah dua host freelance untuk lini kedua (Celana) di samping lini
yang sudah berjalan (Tumbler).

- Lokasi: **Simulasi Jadwal** di sidebar admin, berlabel **BETA** — `app/admin/simulasi-jadwal/`.
- Hanya admin. Host tidak melihat menunya, halaman dijaga `requireAdmin`, dan tabelnya
  dikunci RLS `is_admin()`.
- **Terpisah dari data asli.** Tidak membaca maupun menulis `schedule_assignments`,
  `leave_requests`, atau `attendances`. Satu-satunya data asli yang dibaca: shift aktif
  (untuk disalin) dan daftar host aktif (sebagai peserta awal).
- Belum ada tombol publish. Setelah hitungannya fix, langkah memindahkan aturan ini ke
  jadwal asli dibahas terpisah (lihat `99-open-questions.md` #14).

## Keputusan yang mendasari

| Topik | Keputusan |
|---|---|
| Komposisi | 5 orang: 3 host tetap + 2 freelance, digilir dalam satu jadwal |
| Lini | Tumbler & Celana berjalan bersamaan dari pagi; bisa ditambah lini lain |
| Shift | Awalnya **disamakan dengan Pengaturan Shift** untuk setiap lini, lalu bebas diotak-atik |
| Penugasan | Semua host boleh di lini mana saja |
| Gaji host tetap | Bulanan, diurus admin di luar aplikasi (tarif di simulasi boleh 0) |
| Gaji freelance | Per jam, awal **Rp10.000/jam**; rekap jam × tarif tampil di tab Rekap |
| Libur | Tetap 1×/minggu, freelance 2×/minggu → tepat 1 orang libur per hari (pola 2 lini × 2 shift) |

Hasil simulasi untuk pola yang dimaksud (Pagi 06.00–13.00, Sore 13.00–21.00 di kedua lini):
5 orang menutup 4 slot per hari tanpa dobel dan tanpa slot kosong. Ini dikunci di unit test
`lib/scheduling/__tests__/sandbox.test.ts`.

## Isi halaman

| Tab | Fungsi |
|---|---|
| **Jadwal** | Pilih rentang (1/2/4 minggu), **Generate** (pertahankan yang manual atau susun ulang), **Kosongkan**, dan atur manual per hari: tambah/keluarkan peserta per shift, catat izin. Tabel penuh di desktop, kartu per hari di HP. |
| **Lini & Shift** | Ganti nama/warna lini, tambah/hapus lini, ubah shift (jam, istirahat, min. host), samakan lagi dengan Pengaturan Shift, salin shift antar lini. |
| **Peserta & Aturan** | Hitungan cepat kebutuhan vs kapasitas per minggu; aturan (maks. shift per hari, host tetap dulu, dasar jam dibayar); daftar peserta: jenis, libur/minggu, tarif per jam, ikut dijadwalkan atau tidak; tambah freelance (nama sementara) atau host dari akun. |
| **Rekap** | Per peserta: hari kerja, shift per lini, dobel, libur, izin, jam dibayar, perkiraan bayaran; total biaya freelance dan cakupan slot per lini. |

Perubahan tersimpan otomatis (jeda ±1 detik) ke tabel `schedule_sandboxes`.

## Teknis

- `lib/scheduling/sandbox.ts` — model dokumen (skema zod), isi awal, `generateSandbox`,
  `rebalanceRotation`, `analyzeRange`, `recapRange`. Murni, tanpa database.
- `lib/scheduling/engine.ts` mendapat tiga opsi **opsional**: `maxShiftsPerDay`,
  `SchedulingHost.priority`, dan `SchedulingShift.group`. Jadwal asli tidak mengisinya,
  sehingga perilakunya tidak berubah (semua test lama tetap hijau).
- `rebalanceRotation`: dengan prioritas host tetap, mesin cenderung memberi freelance slot
  terakhir hari itu (selalu sore). Setelah mesin menentukan *siapa* bekerja tiap hari, slot
  hari itu dibagikan ulang ke orang yang sama supaya giliran shift, lini, dan jam merata.
- Migrasi: `supabase/migrations/0018_schedule_sandbox.sql`. Tanpa migrasi ini halaman tetap
  bisa dipakai, tetapi hasilnya tidak tersimpan (ada peringatan di halaman).
