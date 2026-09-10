import { describe, expect, it } from "vitest";

import { generateSchedule } from "@/lib/scheduling/engine";

const shifts = [
  { id: "s-pagi", name: "Pagi", startTime: "06:00", endTime: "14:00", minHosts: 1, sortOrder: 1 },
  { id: "s-siang", name: "Siang", startTime: "14:00", endTime: "20:00", minHosts: 1, sortOrder: 2 },
  { id: "s-malam", name: "Malam", startTime: "20:00", endTime: "23:00", minHosts: 1, sortOrder: 3 },
];

/** Tiga host tanpa jatah libur, supaya rotasinya terlihat murni. */
const hosts = ["a", "b", "c"].map((id) => ({ id, weeklyDayOffQuota: 0 }));

function jalankan(startDate: string, endDate: string) {
  return generateSchedule({ startDate, endDate, hosts, shifts });
}

describe("rotasi shift", () => {
  it("tidak mengunci satu host pada satu shift saja", () => {
    const { assignments } = jalankan("2026-03-02", "2026-03-08");

    for (const host of hosts) {
      const shiftDipegang = new Set(
        assignments.filter((row) => row.hostId === host.id).map((row) => row.shiftId),
      );
      expect(shiftDipegang.size).toBeGreaterThan(1);
    }
  });

  it("membagi tiap shift merata sepanjang sebulan", () => {
    // Pada rentang pendek, penjaga jeda istirahat (hindari malam lalu pagi)
    // membuat sebarannya belum rata betul. Sebulan penuh baru terlihat adil.
    const { assignments } = jalankan("2026-03-02", "2026-03-29");

    for (const shift of shifts) {
      const perHost = hosts.map(
        (host) =>
          assignments.filter((row) => row.shiftId === shift.id && row.hostId === host.id).length,
      );
      const selisih = Math.max(...perHost) - Math.min(...perHost);
      expect(selisih).toBeLessThanOrEqual(1);
    }
  });

  it("shift pagi berpindah orang tiap hari saat host dan shiftnya sama banyak", () => {
    const { assignments } = jalankan("2026-03-02", "2026-03-08");

    const pagi = assignments
      .filter((row) => row.shiftId === "s-pagi")
      .sort((a, b) => a.workDate.localeCompare(b.workDate))
      .map((row) => row.hostId);

    // Tiga host, tiga shift: pola idealnya berputar a, b, c, a, b, c...
    for (let i = 1; i < pagi.length; i++) {
      expect(pagi[i]).not.toBe(pagi[i - 1]);
    }
  });

  it("menggilir shift pagi, tidak diberikan ke orang yang sama tiga hari beruntun", () => {
    const { assignments } = jalankan("2026-03-02", "2026-03-08");

    const pagiBerurutan = assignments
      .filter((row) => row.shiftId === "s-pagi")
      .sort((a, b) => a.workDate.localeCompare(b.workDate))
      .map((row) => row.hostId);

    for (let i = 2; i < pagiBerurutan.length; i++) {
      const tigaSama =
        pagiBerurutan[i] === pagiBerurutan[i - 1] && pagiBerurutan[i] === pagiBerurutan[i - 2];
      expect(tigaSama).toBe(false);
    }
  });

  it("tetap deterministik — dijalankan dua kali hasilnya sama", () => {
    const pertama = jalankan("2026-03-02", "2026-03-15").assignments;
    const kedua = jalankan("2026-03-02", "2026-03-15").assignments;
    expect(kedua).toEqual(pertama);
  });

  it("beban totalnya tetap merata", () => {
    const { assignments } = jalankan("2026-03-02", "2026-03-10");
    const beban = hosts.map((host) => assignments.filter((row) => row.hostId === host.id).length);
    expect(Math.max(...beban) - Math.min(...beban)).toBeLessThanOrEqual(1);
  });
});
