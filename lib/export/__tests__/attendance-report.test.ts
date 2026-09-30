import { inflateSync } from "node:zlib";

import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";

import { buildAttendanceWorkbook } from "@/lib/export/excel";
import { buildAttendancePdf } from "@/lib/export/pdf";
import { groupAttendanceByHost, type AttendanceReportRow, type ReportMeta } from "@/lib/export/queries";

const meta: ReportMeta = {
  title: "Laporan Absensi",
  periodLabel: "September 2026",
  hostLabel: "Semua host",
  generatedAt: "30 September 2026",
};

function baris(overrides: Partial<AttendanceReportRow> & { hostId: string; hostName: string }): AttendanceReportRow {
  return {
    date: "1 September 2026",
    clockIn: "07.00",
    clockOut: "14.00",
    status: "Tepat waktu",
    statusKey: "on_time",
    lateMinutes: 0,
    duration: "7 jam",
    workedMinutes: 420,
    note: "",
    ...overrides,
  };
}

const contoh: AttendanceReportRow[] = [
  baris({ hostId: "h-2", hostName: "Budi Santoso" }),
  baris({
    hostId: "h-1",
    hostName: "Ani Lestari",
    statusKey: "late",
    status: "Telat",
    lateMinutes: 12,
    note: "Sakit, izin pulang setelah jam 12.",
  }),
  baris({ hostId: "h-2", hostName: "Budi Santoso", date: "2 September 2026", workedMinutes: 300 }),
];

describe("groupAttendanceByHost", () => {
  it("memecah baris menjadi satu kelompok per host, urut menurut nama", () => {
    const groups = groupAttendanceByHost(contoh);

    expect(groups.map((group) => group.hostName)).toEqual(["Ani Lestari", "Budi Santoso"]);
    expect(groups[0].rows).toHaveLength(1);
    expect(groups[1].rows).toHaveLength(2);
  });

  it("menjumlahkan telat dan jam kerja per host, bukan digabung semua", () => {
    const [ani, budi] = groupAttendanceByHost(contoh);

    expect(ani.totals).toMatchObject({ records: 1, late: 1, onTime: 0, lateMinutes: 12 });
    expect(budi.totals).toMatchObject({ records: 2, late: 0, onTime: 2, workedMinutes: 720 });
  });

  it("memisahkan dua host bernama sama karena idnya berbeda", () => {
    const kembar = [
      baris({ hostId: "h-1", hostName: "Sri" }),
      baris({ hostId: "h-2", hostName: "Sri" }),
    ];

    expect(groupAttendanceByHost(kembar)).toHaveLength(2);
  });

  it("tidak menghasilkan kelompok apa pun untuk periode kosong", () => {
    expect(groupAttendanceByHost([])).toEqual([]);
  });
});

async function namaSheet(rows: AttendanceReportRow[]) {
  const buffer = await buildAttendanceWorkbook(rows, meta);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(new Uint8Array(buffer).buffer as ArrayBuffer);
  return workbook.worksheets.map((sheet) => sheet.name);
}

describe("buildAttendanceWorkbook", () => {
  it("membuat satu lembar per host, plus ringkasan di depan", async () => {
    expect(await namaSheet(contoh)).toEqual(["Ringkasan", "Ani Lestari", "Budi Santoso"]);
  });

  it("melewatkan ringkasan bila hanya satu host", async () => {
    expect(await namaSheet([contoh[1]])).toEqual(["Ani Lestari"]);
  });

  it("membuang karakter yang ditolak Excel dari nama lembar", async () => {
    const nama = await namaSheet([baris({ hostId: "h-1", hostName: "Rina / Rini [tim: A]" })]);
    // Karakter terlarang jadi spasi, lalu spasi beruntun dirapatkan lagi.
    expect(nama).toEqual(["Rina Rini tim A"]);
  });

  it("memotong nama panjang ke batas 31 karakter", async () => {
    const panjang = "Muhammad Abdurrahman Wijayakusuma Nugroho";
    const [nama] = await namaSheet([baris({ hostId: "h-1", hostName: panjang })]);

    expect(nama).toHaveLength(31);
    expect(panjang.startsWith(nama)).toBe(true);
  });

  it("membedakan lembar yang namanya jadi kembar setelah dipotong", async () => {
    // Tiga puluh satu karakter pertama keduanya sama persis.
    const awalan = "Siti Nurhaliza Ramadhani Putri ";
    const nama = await namaSheet([
      baris({ hostId: "h-1", hostName: `${awalan}Utami` }),
      baris({ hostId: "h-2", hostName: `${awalan}Wulandari` }),
    ]);

    expect(new Set(nama).size).toBe(nama.length);
    expect(nama).toContain("Ringkasan");
  });

  it("membawa catatan absensi ke kolom terakhir", async () => {
    const buffer = await buildAttendanceWorkbook(contoh, meta);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(new Uint8Array(buffer).buffer as ArrayBuffer);

    const sheet = workbook.getWorksheet("Ani Lestari");
    expect(sheet?.getRow(4).getCell(7).value).toBe("Catatan");
    expect(sheet?.getRow(5).getCell(7).value).toBe("Sakit, izin pulang setelah jam 12.");
  });

  it("tetap menghasilkan berkas yang sah saat periodenya kosong", async () => {
    // Buku kerja tanpa satu lembar pun ditolak Excel saat dibuka.
    expect(await namaSheet([])).toEqual(["Ringkasan"]);
  });
});

describe("buildAttendancePdf", () => {
  /** Menghitung objek halaman di dalam berkas PDF mentah. */
  function jumlahHalaman(buffer: Buffer) {
    return (buffer.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length;
  }

  it("memberi satu halaman untuk tiap host, plus halaman ringkasan", async () => {
    const pdf = await buildAttendancePdf(contoh, meta);
    expect(jumlahHalaman(pdf)).toBe(3);
  });

  /** Teks PDF disimpan sebagai untaian heksa di dalam array TJ. */
  function teks(buffer: Buffer) {
    const raw = buffer.toString("latin1");
    const potong: string[] = [];
    const re = /stream\r?\n/g;
    let m: RegExpExecArray | null;

    while ((m = re.exec(raw))) {
      if (raw.slice(m.index - 3, m.index) === "end") continue;
      const mulai = m.index + m[0].length;
      const isi = inflateSync(buffer.subarray(mulai, raw.indexOf("endstream", mulai))).toString("latin1");
      potong.push(
        ...[...isi.matchAll(/<([0-9A-Fa-f]+)>/g)].map((t) => Buffer.from(t[1], "hex").toString("latin1")),
      );
    }

    return potong.join("");
  }

  it("mencetak catatan absensi di halaman orangnya", async () => {
    const isi = teks(await buildAttendancePdf(contoh, meta));

    expect(isi).toContain("Catatan");
    expect(isi).toContain("Sakit, izin pulang setelah jam 12.");
  });

  it("tidak menyisipkan halaman ringkasan bila hanya satu host", async () => {
    const pdf = await buildAttendancePdf([contoh[1]], meta);
    expect(jumlahHalaman(pdf)).toBe(1);
  });

  it("tetap menghasilkan satu halaman berketerangan saat periodenya kosong", async () => {
    const pdf = await buildAttendancePdf([], meta);
    expect(jumlahHalaman(pdf)).toBe(1);
  });
});
