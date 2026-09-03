import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { monthOptions } from "@/lib/utils/period";

describe("monthOptions", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // 15 Maret 2026, siang WIB.
    vi.setSystemTime(new Date("2026-03-15T05:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("mengurut dari bulan terbaru ke terlama", () => {
    const hasil = monthOptions({ back: 2 }).map((item) => item.value);
    expect(hasil).toEqual(["2026-03", "2026-02", "2026-01"]);
  });

  it("bisa memuat bulan mendatang untuk penyusunan jadwal", () => {
    const hasil = monthOptions({ back: 1, forward: 2 }).map((item) => item.value);
    expect(hasil).toEqual(["2026-05", "2026-04", "2026-03", "2026-02"]);
  });

  it("selalu memuat bulan yang diminta walau di luar rentang", () => {
    const hasil = monthOptions({ back: 1, forward: 1, include: "2026-09" }).map((item) => item.value);
    expect(hasil).toContain("2026-09");
    expect(hasil[0]).toBe("2026-09");
  });

  it("tidak menggandakan bulan yang sudah ada di rentang", () => {
    const hasil = monthOptions({ back: 3, include: "2026-02" }).map((item) => item.value);
    expect(hasil.filter((value) => value === "2026-02")).toHaveLength(1);
  });

  it("mengabaikan nilai include yang tidak berbentuk YYYY-MM", () => {
    const hasil = monthOptions({ back: 1, include: "bukan-bulan" }).map((item) => item.value);
    expect(hasil).toEqual(["2026-03", "2026-02"]);
  });

  it("memberi label bulan berbahasa Indonesia", () => {
    expect(monthOptions({ back: 0 })[0].label).toBe("Maret 2026");
  });
});
