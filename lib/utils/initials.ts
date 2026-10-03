/**
 * Inisial nama untuk petak kalender.
 *
 * Petak satu hari di layar 360px hanya menyisakan sekitar empat huruf, jadi
 * label "Siang · Enhas" terpotong jadi "S" — tidak memberi tahu siapa pun
 * siapa yang bertugas. Inisial selalu muat utuh, dan rincian lengkapnya
 * dibuka lewat pratinjau harinya.
 */
export function initials(name: string, maks = 2) {
  const kata = name
    // Tanda hubung dan apostrof dipertahankan: "Nur-Aini" satu nama depan,
    // bukan dua. Tanda baca lain — titik pada "M." misalnya — jadi pemisah.
    .replace(/[^\p{L}\p{N}\s'-]/gu, " ")
    .split(/\s+/)
    // Potongan tanpa huruf maupun angka sama sekali bukan nama.
    .filter((bagian) => /[\p{L}\p{N}]/u.test(bagian));

  if (kata.length === 0) return "?";

  // Nama satu kata diambil dua huruf pertamanya; satu huruf saja terlalu
  // sering bertabrakan antar orang.
  if (kata.length === 1) return kata[0].slice(0, maks).toUpperCase();

  return kata
    .slice(0, maks)
    .map((bagian) => bagian.match(/[\p{L}\p{N}]/u)?.[0] ?? "")
    .join("")
    .toUpperCase();
}
