import { describe, expect, it } from "vitest";

import { buildDemoDataset } from "@/lib/demo/dataset";

const shifts = [
  { id: "shift-pagi", name: "Shift Pagi", startTime: "06:00", endTime: "11:00", minHosts: 1, sortOrder: 1 },
  { id: "shift-siang", name: "Shift Siang", startTime: "11:00", endTime: "16:00", minHosts: 1, sortOrder: 2 },
];

const hosts = [
  { id: "host-a", weeklyDayOffQuota: 1 },
  { id: "host-b", weeklyDayOffQuota: 1 },
  { id: "host-c", weeklyDayOffQuota: 1 },
  { id: "host-d", weeklyDayOffQuota: 1 },
];

function dataset() {
  return buildDemoDataset({
    hosts,
    shifts,
    startDate: "2026-08-01",
    endDate: "2026-08-31",
    today: "2026-08-26",
  });
}

describe("buildDemoDataset", () => {
  it("menjadwalkan sepanjang periode yang diminta", () => {
    const { assignments } = dataset();
    expect(assignments.length).toBeGreaterThan(30);
    expect(assignments.every((item) => item.workDate >= "2026-08-01" && item.workDate <= "2026-08-31")).toBe(true);
  });

  it("tidak membuat absensi untuk hari ini dan hari mendatang", () => {
    const { attendances } = dataset();
    expect(attendances.length).toBeGreaterThan(0);
    expect(attendances.every((item) => item.workDate < "2026-08-26")).toBe(true);
  });

  it("mencatat status hadir, telat, dan tidak absen sekaligus", () => {
    const { attendances } = dataset();
    const status = new Set(attendances.map((item) => item.status));
    expect(status.has("on_time")).toBe(true);
    expect(status.has("late")).toBe(true);
    expect(status.has("absent")).toBe(true);
  });

  it("hanya memberi omzet pada shift yang dihadiri", () => {
    const { attendances, revenues } = dataset();
    const hadir = new Set(
      attendances
        .filter((item) => item.status !== "absent")
        .map((item) => `${item.hostId}|${item.workDate}|${item.shiftId}`),
    );

    for (const revenue of revenues) {
      expect(hadir.has(`${revenue.hostId}|${revenue.workDate}|${revenue.shiftId}`)).toBe(true);
      expect(revenue.amount).toBeGreaterThan(0);
    }
  });

  it("menghitung durasi kerja hanya untuk yang benar-benar hadir", () => {
    const { attendances } = dataset();
    for (const item of attendances) {
      if (item.status === "absent") {
        expect(item.clockInAt).toBeNull();
        expect(item.workedMinutes).toBe(0);
      } else {
        expect(item.clockInAt).not.toBeNull();
        expect(item.workedMinutes).toBeGreaterThan(0);
      }
    }
  });

  it("membuat pengajuan izin dalam tiga status", () => {
    const { leaves } = dataset();
    const status = new Set(leaves.map((item) => item.status));
    expect(status.has("pending")).toBe(true);
    expect(status.has("approved")).toBe(true);
    expect(status.has("rejected")).toBe(true);
  });

  it("tidak membuat pengajuan ganda untuk tanggal dan jenis yang sama", () => {
    const { leaves } = dataset();
    const kunci = leaves.map((item) => `${item.hostId}|${item.type}|${item.requestedDate}`);
    expect(new Set(kunci).size).toBe(kunci.length);
  });

  it("menghasilkan data yang sama untuk masukan yang sama", () => {
    expect(dataset()).toEqual(dataset());
  });
});
