/**
 * Batas panjang catatan absensi.
 *
 * Ditaruh di modul tersendiri, bukan di sebelah server action-nya: berkas
 * "use server" hanya boleh mengekspor fungsi async, sehingga sebuah konstanta
 * di sana menggagalkan build. Dari sini nilainya bisa dipakai bersama oleh
 * pemeriksaan di server dan penghitung karakter di layar, jadi keduanya tidak
 * pernah berbeda pendapat.
 */
export const MAX_PANJANG_CATATAN = 500;
