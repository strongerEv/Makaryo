import { describe, expect, it } from "vitest";

import {
  earliestSwapDate,
  earliestUrgentLeaveDate,
  isSwapLeadTimeValid,
  isUrgentLeadTimeValid,
  isWeeklyOffDateAvailable,
} from "@/lib/leave/rules";

describe("tenggat izin mendadak", () => {
  const hariIni = "2026-03-10";

  it("menolak pengajuan untuk hari ini", () => {
    expect(isUrgentLeadTimeValid("2026-03-10", hariIni)).toBe(false);
  });

  it("menolak pengajuan H-1 dan H-2", () => {
    expect(isUrgentLeadTimeValid("2026-03-11", hariIni)).toBe(false);
    expect(isUrgentLeadTimeValid("2026-03-12", hariIni)).toBe(false);
  });

  it("menerima pengajuan tepat H-3", () => {
    expect(isUrgentLeadTimeValid("2026-03-13", hariIni)).toBe(true);
  });

  it("menerima pengajuan yang lebih jauh dari H-3", () => {
    expect(isUrgentLeadTimeValid("2026-03-20", hariIni)).toBe(true);
  });

  it("menyebut tanggal paling awal yang boleh dipilih", () => {
    expect(earliestUrgentLeaveDate(hariIni)).toBe("2026-03-13");
  });

  it("tetap benar saat melewati pergantian bulan", () => {
    expect(earliestUrgentLeaveDate("2026-03-30")).toBe("2026-04-02");
    expect(isUrgentLeadTimeValid("2026-04-01", "2026-03-30")).toBe(false);
    expect(isUrgentLeadTimeValid("2026-04-02", "2026-03-30")).toBe(true);
  });
});

describe("ketersediaan tanggal libur mingguan", () => {
  it("membolehkan tanggal yang belum diambil siapa pun", () => {
    expect(isWeeklyOffDateAvailable(undefined, 1)).toBe(true);
  });

  it("menolak tanggal yang sudah penuh", () => {
    expect(isWeeklyOffDateAvailable({ taken: 1, mine: false }, 1)).toBe(false);
  });

  it("menolak tanggal yang sudah kita ajukan sendiri", () => {
    expect(isWeeklyOffDateAvailable({ taken: 1, mine: true }, 3)).toBe(false);
  });

  it("mengikuti kuota bila admin mengizinkan lebih dari satu host per tanggal", () => {
    expect(isWeeklyOffDateAvailable({ taken: 1, mine: false }, 2)).toBe(true);
    expect(isWeeklyOffDateAvailable({ taken: 2, mine: false }, 2)).toBe(false);
  });
});

describe("aturan tukar shift", () => {
  it("menolak shift hari ini", () => {
    expect(isSwapLeadTimeValid("2026-09-06", "2026-09-06")).toBe(false);
  });

  it("menolak shift yang sudah lewat", () => {
    expect(isSwapLeadTimeValid("2026-09-05", "2026-09-06")).toBe(false);
  });

  it("menerima shift besok — batas H-1", () => {
    expect(isSwapLeadTimeValid("2026-09-07", "2026-09-06")).toBe(true);
  });

  it("menerima shift yang lebih jauh", () => {
    expect(isSwapLeadTimeValid("2026-09-20", "2026-09-06")).toBe(true);
  });

  it("earliestSwapDate mengembalikan besok", () => {
    expect(earliestSwapDate("2026-09-06")).toBe("2026-09-07");
  });

  it("tetap benar saat berganti bulan", () => {
    expect(earliestSwapDate("2026-09-30")).toBe("2026-10-01");
  });
});
