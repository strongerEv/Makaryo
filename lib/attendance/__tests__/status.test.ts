import { describe, expect, it } from "vitest";

import { evaluateClockIn, formatDuration, workedMinutesBetween } from "@/lib/attendance/status";
import { shiftDurationMinutes, shiftEndInstant, shiftStartInstant } from "@/lib/attendance/time";

describe("evaluateClockIn", () => {
  const workDate = "2026-03-10";

  it("menganggap tepat waktu bila absen sebelum jam mulai", () => {
    const result = evaluateClockIn({
      clockInAt: new Date("2026-03-10T05:58:00+07:00"),
      workDate,
      shiftStartTime: "06:00:00",
    });
    expect(result).toEqual({ status: "on_time", lateMinutes: 0 });
  });

  it("menghitung menit keterlambatan dibulatkan ke atas", () => {
    const result = evaluateClockIn({
      clockInAt: new Date("2026-03-10T06:12:30+07:00"),
      workDate,
      shiftStartTime: "06:00:00",
    });
    expect(result.status).toBe("late");
    expect(result.lateMinutes).toBe(13);
  });

  it("menghormati toleransi telat dari pengaturan", () => {
    const result = evaluateClockIn({
      clockInAt: new Date("2026-03-10T06:10:00+07:00"),
      workDate,
      shiftStartTime: "06:00:00",
      toleranceMinutes: 15,
    });
    expect(result.status).toBe("on_time");
  });

  it("menganggap tepat waktu bila tidak ada jadwal", () => {
    const result = evaluateClockIn({
      clockInAt: new Date("2026-03-10T23:00:00+07:00"),
      workDate,
      shiftStartTime: null,
    });
    expect(result.status).toBe("on_time");
  });
});

describe("jam shift", () => {
  it("menerjemahkan jam WIB ke instant UTC", () => {
    expect(shiftStartInstant("2026-03-10", "06:00:00").toISOString()).toBe("2026-03-09T23:00:00.000Z");
  });

  it("memajukan sehari untuk shift yang melewati tengah malam", () => {
    const end = shiftEndInstant("2026-03-10", "21:00:00", "02:00:00");
    expect(end.toISOString()).toBe("2026-03-10T19:00:00.000Z");
  });

  it("menghitung durasi shift lintas tengah malam", () => {
    expect(shiftDurationMinutes("21:00:00", "02:00:00")).toBe(300);
  });
});

describe("durasi kerja", () => {
  it("menghitung selisih dalam menit", () => {
    expect(workedMinutesBetween("2026-03-10T06:00:00Z", "2026-03-10T11:30:00Z")).toBe(330);
  });

  it("memformat durasi ke bahasa Indonesia", () => {
    expect(formatDuration(0)).toBe("0 jam");
    expect(formatDuration(45)).toBe("45 menit");
    expect(formatDuration(120)).toBe("2 jam");
    expect(formatDuration(155)).toBe("2 jam 35 menit");
  });
});
