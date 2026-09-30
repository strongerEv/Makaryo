import "server-only";

import ExcelJS from "exceljs";

import {
  groupAttendanceByHost,
  sumAttendance,
  type AttendanceReportRow,
  type AttendanceTotals,
  type HostAttendanceGroup,
  type ReportMeta,
  type RevenueReportRow,
} from "@/lib/export/queries";

function createWorkbook() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Makaryo";
  workbook.created = new Date();
  return workbook;
}

/**
 * Menambahkan satu lembar berjudul, lengkap dengan blok keterangan periode.
 *
 * `subtitle` menggantikan baris "Host: ..." pada lembar per orang — di sana
 * namanya sudah jadi judul lembarnya, jadi mengulanginya cuma makan tempat.
 */
function addSheet(
  workbook: ExcelJS.Workbook,
  meta: ReportMeta,
  {
    name,
    heading,
    subtitle,
    columns = 6,
  }: { name: string; heading: string; subtitle: string; columns?: number },
) {
  const sheet = workbook.addWorksheet(name, {
    views: [{ state: "frozen", ySplit: 4 }],
  });

  // Judulnya membentang selebar tabel di bawahnya, bukan lebar tetap.
  sheet.mergeCells(1, 1, 1, columns);
  const titleCell = sheet.getCell("A1");
  titleCell.value = heading;
  titleCell.font = { size: 14, bold: true, color: { argb: "FF1E2145" } };

  sheet.getCell("A2").value = `Periode: ${meta.periodLabel}`;
  sheet.getCell("A3").value = subtitle;
  sheet.getRow(2).font = { size: 10, color: { argb: "FF7C7F9E" } };
  sheet.getRow(3).font = { size: 10, color: { argb: "FF7C7F9E" } };

  return sheet;
}

/** Karakter yang ditolak Excel pada nama lembar. */
const KARAKTER_TERLARANG = /[\\/?*[\]:]/g;
const PANJANG_MAKS_NAMA_SHEET = 31;

/**
 * Mengubah nama orang menjadi nama lembar yang sah dan unik.
 *
 * Excel menolak berkasnya sama sekali bila ada nama lembar yang memuat karakter
 * terlarang, melebihi 31 karakter, atau kembar — dan kegagalannya baru terlihat
 * saat pengguna membuka berkas, bukan saat dibuat. Nama yang terpotong sampai
 * batas 31 juga bisa berubah jadi kembar, jadi keunikannya diperiksa setelah
 * pemotongan, bukan sebelumnya.
 */
function sheetName(nama: string, dipakai: Set<string>) {
  const bersih = nama.replace(KARAKTER_TERLARANG, " ").replace(/\s+/g, " ").trim();
  const dasar = (bersih || "Tanpa nama").slice(0, PANJANG_MAKS_NAMA_SHEET);

  let kandidat = dasar;
  let urutan = 2;

  while (dipakai.has(kandidat.toLowerCase())) {
    const akhiran = ` (${urutan})`;
    kandidat = `${dasar.slice(0, PANJANG_MAKS_NAMA_SHEET - akhiran.length)}${akhiran}`;
    urutan += 1;
  }

  dipakai.add(kandidat.toLowerCase());
  return kandidat;
}

function jamMenit(totalMenit: number) {
  return `${Math.floor(totalMenit / 60)} jam ${totalMenit % 60} menit`;
}

function styleHeader(row: ExcelJS.Row) {
  row.font = { bold: true, color: { argb: "FFFFFFFF" } };
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF5B4CE0" } };
  row.alignment = { vertical: "middle" };
  row.height = 22;
}

/**
 * Rekap absensi: satu lembar per host, plus lembar ringkasan di depan.
 *
 * Sebelumnya semua orang ditumpuk di satu lembar dengan kolom "Host", sehingga
 * untuk melihat catatan satu orang harus disaring dulu — dan menyerahkan rekap
 * ke orang yang bersangkutan berarti ikut membagikan catatan rekan-rekannya.
 * Sekarang tiap orang punya lembarnya sendiri, bernama sesuai namanya.
 */
export async function buildAttendanceWorkbook(rows: AttendanceReportRow[], meta: ReportMeta) {
  const workbook = createWorkbook();
  const groups = groupAttendanceByHost(rows);
  const dipakai = new Set<string>();

  // Buku kerja tanpa satu lembar pun ditolak Excel, jadi periode kosong tetap
  // mendapat lembar — berisi keterangan, bukan tabel kosong tanpa penjelasan.
  if (groups.length === 0) {
    const sheet = addSheet(workbook, meta, {
      name: sheetName("Ringkasan", dipakai),
      heading: `${meta.title} — Makaryo`,
      subtitle: `Host: ${meta.hostLabel} · Dibuat: ${meta.generatedAt}`,
    });
    sheet.addRow(["Tidak ada catatan absensi pada periode ini."]);
    sheet.getColumn(1).width = 48;
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  // Ringkasan hanya berguna saat ada lebih dari satu orang untuk dibandingkan.
  if (groups.length > 1) addSummarySheet(workbook, meta, groups, dipakai);

  for (const group of groups) {
    const sheet = addSheet(workbook, meta, {
      name: sheetName(group.hostName, dipakai),
      heading: group.hostName,
      subtitle: `${meta.title} · Dibuat: ${meta.generatedAt}`,
      columns: 7,
    });

    // Kolom "Host" sengaja dibuang: namanya sudah jadi judul lembarnya.
    const header = sheet.addRow([
      "Tanggal",
      "Clock in",
      "Clock out",
      "Status",
      "Telat (menit)",
      "Durasi",
      "Catatan",
    ]);
    styleHeader(header);

    group.rows.forEach((row) => {
      const added = sheet.addRow([
        row.date,
        row.clockIn,
        row.clockOut,
        row.status,
        row.lateMinutes,
        row.duration,
        row.note,
      ]);
      // Catatan bisa beberapa kalimat; dibungkus supaya tidak melebar ke samping.
      added.getCell(7).alignment = { wrapText: true, vertical: "top" };
    });

    const summary = sheet.addRow([
      `Total ${group.totals.records} catatan`,
      "",
      "",
      `${group.totals.late} kali telat`,
      group.totals.lateMinutes,
      jamMenit(group.totals.workedMinutes),
      "",
    ]);
    summary.font = { bold: true };

    sheet.columns.forEach((column, index) => {
      column.width = index === 0 ? 22 : index === 3 ? 18 : index === 6 ? 48 : 16;
    });
  }

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

/** Satu baris per host: siapa paling sering telat, siapa paling banyak jam kerja. */
function addSummarySheet(
  workbook: ExcelJS.Workbook,
  meta: ReportMeta,
  groups: HostAttendanceGroup[],
  dipakai: Set<string>,
) {
  const sheet = addSheet(workbook, meta, {
    name: sheetName("Ringkasan", dipakai),
    heading: `${meta.title} — Makaryo`,
    subtitle: `Host: ${meta.hostLabel} · Dibuat: ${meta.generatedAt}`,
    columns: 7,
  });

  const header = sheet.addRow([
    "Host",
    "Jumlah catatan",
    "Tepat waktu",
    "Telat",
    "Tidak absen",
    "Total telat (menit)",
    "Total jam kerja",
  ]);
  styleHeader(header);

  groups.forEach((group) => {
    sheet.addRow([
      group.hostName,
      group.totals.records,
      group.totals.onTime,
      group.totals.late,
      group.totals.absent,
      group.totals.lateMinutes,
      jamMenit(group.totals.workedMinutes),
    ]);
  });

  const semua: AttendanceTotals = sumAttendance(groups.flatMap((group) => group.rows));
  const summary = sheet.addRow([
    `Total ${groups.length} host`,
    semua.records,
    semua.onTime,
    semua.late,
    semua.absent,
    semua.lateMinutes,
    jamMenit(semua.workedMinutes),
  ]);
  summary.font = { bold: true };

  sheet.columns.forEach((column, index) => {
    column.width = index === 0 ? 28 : index === 6 ? 20 : 16;
  });
}

export async function buildRevenueWorkbook(rows: RevenueReportRow[], meta: ReportMeta) {
  const workbook = createWorkbook();
  const sheet = addSheet(workbook, meta, {
    name: meta.title,
    heading: `${meta.title} — Makaryo`,
    subtitle: `Host: ${meta.hostLabel} · Dibuat: ${meta.generatedAt}`,
  });

  const header = sheet.addRow(["Tanggal", "Host", "Shift", "Omzet (Rp)", "Catatan"]);
  styleHeader(header);

  rows.forEach((row) => {
    const added = sheet.addRow([row.date, row.hostName, row.shiftName, row.amount, row.note]);
    added.getCell(4).numFmt = "#,##0";
  });

  const summary = sheet.addRow([
    "Total",
    `${rows.length} laporan`,
    "",
    rows.reduce((sum, row) => sum + row.amount, 0),
    "",
  ]);
  summary.font = { bold: true };
  summary.getCell(4).numFmt = "#,##0";

  sheet.columns.forEach((column, index) => {
    column.width = index === 1 ? 28 : index === 4 ? 32 : 16;
  });

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
