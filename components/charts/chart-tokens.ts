/**
 * Warna khusus grafik. Sengaja lebih gelap dari token UI agar kontras terhadap
 * permukaan kartu melewati 3:1 (diverifikasi dengan validator palet).
 * Tiap grafik memakai satu seri, jadi identitas warna tidak pernah ambigu.
 */
export const CHART_COLORS = {
  revenue: "#5B4CE0",
  attendance: "#1F8A51",
  grid: "#E7E9F5",
  axis: "#7C7F9E",
};

export const AXIS_TICK = { fill: CHART_COLORS.axis, fontSize: 11, fontWeight: 600 };
