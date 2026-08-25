# Design System

Arah visual mengikuti referensi yang diberikan klien: kartu besar membulat dengan aksen warna
berbeda per modul, latar terang kebiruan, sapaan personal di header, dan navigasi pil melayang
di bawah. Nuansanya ramah dan lapang, bukan korporat-kaku.

## Token warna

```css
--bg:            #F2F4FB;  /* latar halaman */
--surface:       #FFFFFF;  /* kartu */
--surface-muted: #F7F8FD;  /* kartu sekunder, baris tabel selang-seling */
--border:        #E7E9F5;

--text:          #1E2145;  /* judul & angka */
--text-muted:    #7C7F9E;  /* label, keterangan */

--primary:       #5B4CE0;  /* ungu — aksi utama, nav aktif */
--primary-soft:  #EDEBFD;  /* latar chip/ikon ungu */
--coral:         #F4685E;  /* merah — peringatan lembut, modul absensi */
--amber:         #F5B23D;  /* kuning — pending, menunggu approval */
--emerald:       #35BF74;  /* hijau — hadir tepat waktu, disetujui */
--sky:           #3FA9F5;  /* biru — informasi, omzet */
```

Pemetaan status yang konsisten di seluruh aplikasi:

| Status | Warna |
|---|---|
| Tepat waktu, disetujui, aktif | `emerald` |
| Telat, pending, menunggu | `amber` |
| Tidak absen, ditolak, nonaktif | `coral` |
| Draft, informasi netral | `text-muted` di atas `surface-muted` |
| Terpublish, aksi utama | `primary` |

Kartu modul di beranda memakai warna penuh bergantian (`primary`, `coral`, `amber`, `emerald`)
persis seperti referensi, dengan teks putih dan ikon di dalam lingkaran semi-transparan.

## Bentuk & bayangan

```css
--radius-card:  24px;   /* kartu utama */
--radius-md:    16px;   /* input, kartu kecil */
--radius-pill:  999px;  /* tombol, chip, bottom nav */
--shadow-card:  0 8px 24px rgba(30, 33, 69, .06);
--shadow-float: 0 12px 32px rgba(91, 76, 224, .28);  /* bottom nav & FAB */
```

Jarak memakai kelipatan 4px. Padding kartu 20–24px di mobile, 24–32px di desktop.

## Tipografi

Font: **Plus Jakarta Sans** (fallback: `ui-sans-serif, system-ui, sans-serif`) — memberi kesan
membulat yang cocok dengan referensi dan punya dukungan bahasa Indonesia yang baik.

| Peran | Ukuran / bobot |
|---|---|
| Sapaan ("Selamat pagi,") | 14px / 500 / `text-muted` |
| Nama pengguna | 24px / 700 |
| Judul halaman | 20px / 700 |
| Judul bagian | 16px / 600 |
| Teks isi | 14px / 400–500 |
| Label & keterangan | 12px / 500 / `text-muted` |
| Angka besar (statistik) | 28–32px / 700, angka tabular |

## Aturan responsif

Satu basis kode, dua kepribadian. Titik potong: **`lg` = 1024px**.

| | Mobile (< 1024px) | Desktop (≥ 1024px) |
|---|---|---|
| Navigasi | Bottom nav pil melayang, 4–5 ikon | Sidebar kiri 260px, label penuh, tetap terlihat |
| Header | Sapaan + lonceng + cari | Bar atas: judul halaman, cari, lonceng, menu profil |
| Konten | Satu kolom, kartu bertumpuk | Grid maksimal 1280px, 2–3 kolom |
| Tabel | Kartu bertumpuk (bukan tabel gulir) | Tabel penuh dengan header lengket |
| Kalender | Daftar per hari & petak bulanan sederhana | Petak penuh dengan semua host per sel |
| Aksi (form) | Sheet/drawer dari bawah | Dialog di tengah, maks 560px |
| Aksi utama | Tombol lebar penuh | Tombol otomatis, rata kanan |

Aturan lain:
- Target sentuh minimal 44×44px.
- Uji setiap halaman di 360px, 768px, dan 1440px sebelum dianggap selesai.
- Tombol Clock In/Out di beranda host adalah elemen paling menonjol di layar mobile.
- Halaman admin dirancang desktop lebih dulu, tetap harus terbaca di HP.
- Hormati `prefers-reduced-motion`; animasi maksimal 200ms.

## Komponen inti (dibangun di Sesi 1)

`Button` (primary / soft / ghost / danger, tiga ukuran) · `Card` · `StatCard` (label, angka besar,
tren opsional) · `ModuleCard` (kartu warna penuh dengan ikon) · `Input`, `Select`, `DatePicker`,
`Textarea` · `Badge` (memakai peta status di atas) · `Avatar` · `EmptyState` · `Sheet` (mobile) /
`Dialog` (desktop) · `Tabs` · `Toast` · `Skeleton` · `AppShell` + `BottomNav` + `Sidebar` + `PageHeader`.

## Aksesibilitas

- Kontras teks minimal 4.5:1. Teks putih di atas `amber` tidak lolos — pakai `--text` untuk teks
  di atas kuning.
- Status tidak boleh dibedakan hanya lewat warna; selalu sertai label atau ikon.
- Semua kontrol dapat dijangkau keyboard dengan cincin fokus yang terlihat.
- Bahasa halaman `<html lang="id">`.
