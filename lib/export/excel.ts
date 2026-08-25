import "server-only";

import ExcelJS from "exceljs";

import type {
  AttendanceReportRow,
  ReportMeta,
  RevenueReportRow,
} from "@/lib/export/queries";

function createWorkbook(meta: ReportMeta) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Makaryo";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(meta.title, {
    views: [{ state: "frozen", ySplit: 4 }],
  });

  sheet.mergeCells("A1:F1");
  const titleCell = sheet.getCell("A1");
  titleCell.value = `${meta.title} — Makaryo`;
  titleCell.font = { size: 14, bold: true, color: { argb: "FF1E2145" } };

  sheet.getCell("A2").value = `Periode: ${meta.periodLabel}`;
  sheet.getCell("A3").value = `Host: ${meta.hostLabel} · Dibuat: ${meta.generatedAt}`;
  sheet.getRow(2).font = { size: 10, color: { argb: "FF7C7F9E" } };
  sheet.getRow(3).font = { size: 10, color: { argb: "FF7C7F9E" } };

  return { workbook, sheet };
}

function styleHeader(row: ExcelJS.Row) {
  row.font = { bold: true, color: { argb: "FFFFFFFF" } };
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF5B4CE0" } };
  row.alignment = { vertical: "middle" };
  row.height = 22;
}

export async function buildAttendanceWorkbook(rows: AttendanceReportRow[], meta: ReportMeta) {
  const { workbook, sheet } = createWorkbook(meta);

  const header = sheet.addRow(["Tanggal", "Host", "Clock in", "Clock out", "Status", "Telat (menit)", "Durasi"]);
  styleHeader(header);

  rows.forEach((row) => {
    sheet.addRow([row.date, row.hostName, row.clockIn, row.clockOut, row.status, row.lateMinutes, row.duration]);
  });

  const totalMinutes = rows.reduce((sum, row) => sum + row.workedMinutes, 0);
  const summary = sheet.addRow([
    "Total",
    `${rows.length} catatan`,
    "",
    "",
    "",
    rows.reduce((sum, row) => sum + row.lateMinutes, 0),
    `${Math.floor(totalMinutes / 60)} jam ${totalMinutes % 60} menit`,
  ]);
  summary.font = { bold: true };

  sheet.columns.forEach((column, index) => {
    column.width = index === 1 ? 28 : 16;
  });

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

export async function buildRevenueWorkbook(rows: RevenueReportRow[], meta: ReportMeta) {
  const { workbook, sheet } = createWorkbook(meta);

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
