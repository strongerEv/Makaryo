/**
 * Ucapan penyemangat yang ditampilkan di halaman absen host.
 *
 * Isinya sengaja pendek dan membumi — soal ritme kerja host live streaming,
 * bukan kutipan motivasi umum yang terdengar kosong.
 */
export const MOTIVATIONS = [
  "Mulai dari sapaan yang tulus. Sisanya biasanya mengalir sendiri.",
  "Penonton datang untuk orangnya, bukan cuma untuk barangnya.",
  "Hari ini tidak harus sempurna. Cukup hadir dan sungguh-sungguh.",
  "Satu jam yang fokus lebih berharga daripada tiga jam yang setengah hati.",
  "Kamera menyala, semangatnya ikut menyala. Nikmati sesimu hari ini.",
  "Yang konsisten hampir selalu menyusul yang berbakat.",
  "Senyum di menit pertama menentukan rasa satu sesi penuh.",
  "Kalau sepi di awal, tetap lanjut. Ramai sering datang belakangan.",
  "Kenali satu penonton baru hari ini, sekadar sebut namanya.",
  "Tarik napas, rapikan meja, lalu mulai. Sederhana itu cukup.",
  "Suaramu hari ini bisa jadi hiburan seseorang yang sedang lelah.",
  "Datang tepat waktu itu bentuk paling sederhana dari profesional.",
  "Tidak ada sesi yang sia-sia — semuanya menambah jam terbang.",
  "Bandingkan dirimu dengan dirimu kemarin, bukan dengan orang lain.",
  "Energi yang kamu bawa ke layar akan dipantulkan balik oleh penonton.",
  "Istirahat yang cukup bagian dari kerja, bukan lawannya.",
  "Kesalahan kecil di siaran itu manusiawi, dan justru bikin dekat.",
  "Target hari ini: selesai dengan perasaan lega, bukan sekadar selesai.",
  "Persiapan lima menit menyelamatkan satu jam kebingungan.",
  "Kamu sedang membangun sesuatu, walaupun hari ini terasa biasa saja.",
  "Ramah ke penonton itu gratis, dan nilainya paling mahal.",
  "Sesi yang baik dimulai dari niat yang jelas. Apa targetmu hari ini?",
  "Semangat itu menular. Mulai dari kamu dulu.",
  "Naik satu anak tangga hari ini sudah lebih baik daripada diam.",
  "Percaya prosesnya. Angka menyusul kalau kebiasaannya benar.",
  "Hari ini kesempatan baru untuk jadi host yang kamu banggakan.",
  "Fokus ke yang bisa kamu kendalikan: persiapan, sikap, dan kehadiran.",
  "Setiap sapaan yang kamu balas menambah satu alasan orang bertahan.",
  "Jangan lupa minum dan luruskan punggung di sela sesi.",
  "Selesaikan shift-mu hari ini dengan rapi — itu sudah kemenangan.",
  "Bersyukur dulu sebelum siaran, biar yang keluar bukan keluhan.",
];

/** Jumlah hari sejak 1970-01-01 untuk tanggal `YYYY-MM-DD`. */
function dayNumber(workDate: string) {
  const [year, month, day] = workDate.split("-").map(Number);
  if (!year || !month || !day) return 0;
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
}

/**
 * Ucapan untuk satu tanggal. Deterministik: sama sepanjang hari itu, dan
 * berganti tiap ganti hari tanpa pernah mengulang dua hari berturut-turut.
 */
export function dailyMotivation(workDate: string) {
  const index = ((dayNumber(workDate) % MOTIVATIONS.length) + MOTIVATIONS.length) % MOTIVATIONS.length;
  return MOTIVATIONS[index];
}
