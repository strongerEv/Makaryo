import { describe, expect, it } from "vitest";

import { dailyMotivation, MOTIVATIONS } from "@/lib/attendance/motivation";

describe("dailyMotivation", () => {
  it("selalu sama untuk tanggal yang sama", () => {
    expect(dailyMotivation("2026-09-03")).toBe(dailyMotivation("2026-09-03"));
  });

  it("berganti tiap hari dan tidak mengulang hari berikutnya", () => {
    const dates = ["2026-09-01", "2026-09-02", "2026-09-03", "2026-09-04"];
    const hasil = dates.map(dailyMotivation);

    for (let i = 1; i < hasil.length; i++) {
      expect(hasil[i]).not.toBe(hasil[i - 1]);
    }
  });

  it("memakai seluruh daftar dalam satu putaran", () => {
    const mulai = Date.UTC(2026, 0, 1);
    const terpakai = new Set<string>();

    for (let i = 0; i < MOTIVATIONS.length; i++) {
      const tanggal = new Date(mulai + i * 86_400_000).toISOString().slice(0, 10);
      terpakai.add(dailyMotivation(tanggal));
    }

    expect(terpakai.size).toBe(MOTIVATIONS.length);
  });

  it("mengembalikan ucapan yang valid walau tanggalnya kacau", () => {
    expect(MOTIVATIONS).toContain(dailyMotivation(""));
    expect(MOTIVATIONS).toContain(dailyMotivation("bukan-tanggal"));
  });
});
