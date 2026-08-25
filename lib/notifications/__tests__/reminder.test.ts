import { describe, expect, it } from "vitest";

import { crossedReminderStages, reminderLabel } from "@/lib/notifications/reminder";

describe("crossedReminderStages", () => {
  it("mengabaikan shift yang masih terlalu jauh", () => {
    expect(crossedReminderStages(75)).toEqual([]);
  });

  it("mengabaikan shift yang sudah dimulai", () => {
    expect(crossedReminderStages(-1)).toEqual([]);
  });

  it("menandai tahap satu jam saat baru melewatinya", () => {
    expect(crossedReminderStages(58)).toEqual([60]);
  });

  it("menandai tahap 30 menit tanpa mengulang tahap sebelumnya", () => {
    expect(crossedReminderStages(28)).toEqual([60, 30]);
  });

  it("menandai seluruh tahap saat sisa waktu tinggal sedikit", () => {
    expect(crossedReminderStages(3)).toEqual([60, 30, 15]);
  });

  it("tetap mengembalikan tahap saat penjadwal telat jauh", () => {
    // Penjadwal mati lalu hidup lagi pada sisa 20 menit: tahap 60 dan 30
    // ikut tercatat agar tidak terkirim susulan, dan hostnya tetap diingatkan.
    expect(crossedReminderStages(20)).toEqual([60, 30]);
  });
});

describe("reminderLabel", () => {
  it("menyebut satu jam untuk sisa waktu mendekati 60 menit", () => {
    expect(reminderLabel(59.4)).toBe("1 jam lagi");
    expect(reminderLabel(55)).toBe("1 jam lagi");
  });

  it("menyebut sisa menit sebenarnya, bukan tahapnya", () => {
    expect(reminderLabel(20.2)).toBe("20 menit lagi");
    expect(reminderLabel(13.6)).toBe("14 menit lagi");
  });

  it("tidak pernah menyebut nol menit", () => {
    expect(reminderLabel(0.2)).toBe("1 menit lagi");
  });
});
