import { describe, expect, it } from "vitest";

import {
  breakMinutes,
  formatLiveHours,
  liveMinutes,
  shiftSpanMinutes,
  timeToMinutes,
} from "@/lib/attendance/shift-hours";

describe("timeToMinutes", () => {
  it("menerima format jam dari database maupun input", () => {
    expect(timeToMinutes("06:00:00")).toBe(360);
    expect(timeToMinutes("06:30")).toBe(390);
  });

  it("mengembalikan null bila kosong atau tidak valid", () => {
    expect(timeToMinutes(null)).toBeNull();
    expect(timeToMinutes("")).toBeNull();
    expect(timeToMinutes("bukan-jam")).toBeNull();
  });
});

describe("shiftSpanMinutes", () => {
  it("menghitung shift biasa", () => {
    expect(shiftSpanMinutes("06:00", "14:00")).toBe(480);
  });

  it("menghitung shift yang melewati tengah malam", () => {
    expect(shiftSpanMinutes("21:00", "02:00")).toBe(300);
  });
});

describe("breakMinutes", () => {
  it("menghitung lama istirahat", () => {
    expect(breakMinutes("11:00", "12:00")).toBe(60);
    expect(breakMinutes("11:00", "11:30")).toBe(30);
  });

  it("nol bila salah satu jamnya kosong", () => {
    expect(breakMinutes(null, "12:00")).toBe(0);
    expect(breakMinutes("11:00", null)).toBe(0);
  });
});

describe("liveMinutes", () => {
  it("mengurangi istirahat dari rentang shift", () => {
    // Contoh dari desain: 06:00–14:00 dengan istirahat 11:00–12:00 = 7 jam.
    expect(liveMinutes({ startTime: "06:00", endTime: "14:00", breakStart: "11:00", breakEnd: "12:00" })).toBe(420);
  });

  it("sama dengan rentang penuh bila tanpa istirahat", () => {
    expect(liveMinutes({ startTime: "10:00", endTime: "18:00" })).toBe(480);
  });

  it("tetap benar untuk shift lewat tengah malam", () => {
    expect(liveMinutes({ startTime: "21:00", endTime: "05:00", breakStart: "01:00", breakEnd: "01:30" })).toBe(450);
  });

  it("tidak pernah negatif", () => {
    expect(liveMinutes({ startTime: "08:00", endTime: "09:00", breakStart: "08:00", breakEnd: "10:00" })).toBe(0);
  });
});

describe("formatLiveHours", () => {
  it("menulis jam bulat tanpa desimal", () => {
    expect(formatLiveHours(420)).toBe("7 jam");
  });

  it("memakai koma untuk setengah jam, sesuai gaya Indonesia", () => {
    expect(formatLiveHours(390)).toBe("6,5 jam");
  });

  it("nol bila tidak ada jam live", () => {
    expect(formatLiveHours(0)).toBe("0 jam");
  });
});
