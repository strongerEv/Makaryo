/**
 * Konfirmasi ketik-ulang untuk penghapusan yang tidak bisa dibatalkan.
 *
 * Tombol merah saja tidak cukup: sekali salah tekan, data simulasi maupun data
 * asli sama-sama hilang tanpa jejak. Mengetik satu kata memaksa berhenti sejenak
 * dan membaca lagi apa yang akan terhapus.
 *
 * Kata kuncinya ditaruh di sini supaya sisi server dan sisi tampilan tidak
 * pernah bisa berbeda pendapat soal kata apa yang diminta.
 */
export const KATA_KONFIRMASI = "HAPUS";

/** Longgar terhadap spasi dan huruf besar-kecil, ketat terhadap katanya. */
export function konfirmasiCocok(value: FormDataEntryValue | null | undefined) {
  return String(value ?? "").trim().toUpperCase() === KATA_KONFIRMASI;
}

export const PESAN_KONFIRMASI = `Ketik ${KATA_KONFIRMASI} pada kotak konfirmasi untuk melanjutkan.`;
