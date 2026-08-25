import "server-only";

import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";

import type { AttendanceReportRow, ReportMeta, RevenueReportRow } from "@/lib/export/queries";
import { formatCurrency } from "@/lib/utils/format";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 9, color: "#1E2145" },
  title: { fontSize: 16, fontWeight: 700 },
  subtitle: { fontSize: 9, color: "#7C7F9E", marginTop: 4 },
  headerBlock: { marginBottom: 16, borderBottomWidth: 1, borderBottomColor: "#E7E9F5", paddingBottom: 10 },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#E7E9F5", paddingVertical: 6 },
  headerRow: { flexDirection: "row", backgroundColor: "#5B4CE0", paddingVertical: 7, paddingHorizontal: 4 },
  headerCell: { color: "#FFFFFF", fontWeight: 700, fontSize: 9 },
  cell: { paddingHorizontal: 4 },
  totalRow: { flexDirection: "row", paddingVertical: 8, paddingHorizontal: 4, backgroundColor: "#F2F4FB" },
  bold: { fontWeight: 700 },
  footer: { position: "absolute", bottom: 20, left: 32, right: 32, fontSize: 8, color: "#7C7F9E" },
});

function ReportHeader({ meta }: { meta: ReportMeta }) {
  return (
    <View style={styles.headerBlock}>
      <Text style={styles.title}>{meta.title}</Text>
      <Text style={styles.subtitle}>
        Periode {meta.periodLabel} · {meta.hostLabel} · dibuat {meta.generatedAt} · Makaryo
      </Text>
    </View>
  );
}

function AttendanceDocument({ rows, meta }: { rows: AttendanceReportRow[]; meta: ReportMeta }) {
  const widths = ["18%", "24%", "13%", "13%", "14%", "8%", "10%"];
  const headers = ["Tanggal", "Host", "Clock in", "Clock out", "Status", "Telat", "Durasi"];
  const totalLate = rows.reduce((sum, row) => sum + row.lateMinutes, 0);
  const totalMinutes = rows.reduce((sum, row) => sum + row.workedMinutes, 0);

  return (
    <Document title={meta.title}>
      <Page size="A4" style={styles.page}>
        <ReportHeader meta={meta} />

        <View style={styles.headerRow}>
          {headers.map((header, index) => (
            <Text key={header} style={[styles.headerCell, { width: widths[index] }]}>
              {header}
            </Text>
          ))}
        </View>

        {rows.map((row, index) => (
          <View key={`${row.date}-${row.hostName}-${index}`} style={styles.row}>
            <Text style={[styles.cell, { width: widths[0] }]}>{row.date}</Text>
            <Text style={[styles.cell, { width: widths[1] }]}>{row.hostName}</Text>
            <Text style={[styles.cell, { width: widths[2] }]}>{row.clockIn}</Text>
            <Text style={[styles.cell, { width: widths[3] }]}>{row.clockOut}</Text>
            <Text style={[styles.cell, { width: widths[4] }]}>{row.status}</Text>
            <Text style={[styles.cell, { width: widths[5] }]}>{row.lateMinutes}</Text>
            <Text style={[styles.cell, { width: widths[6] }]}>{row.duration}</Text>
          </View>
        ))}

        <View style={styles.totalRow}>
          <Text style={[styles.bold, { width: "42%" }]}>Total {rows.length} catatan</Text>
          <Text style={[styles.bold, { width: "40%" }]}>Total telat {totalLate} menit</Text>
          <Text style={[styles.bold, { width: "18%" }]}>
            {Math.floor(totalMinutes / 60)}j {totalMinutes % 60}m
          </Text>
        </View>

        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) => `Halaman ${pageNumber} dari ${totalPages}`}
          fixed
        />
      </Page>
    </Document>
  );
}

function RevenueDocument({ rows, meta }: { rows: RevenueReportRow[]; meta: ReportMeta }) {
  const widths = ["18%", "26%", "18%", "18%", "20%"];
  const headers = ["Tanggal", "Host", "Shift", "Omzet", "Catatan"];
  const total = rows.reduce((sum, row) => sum + row.amount, 0);

  return (
    <Document title={meta.title}>
      <Page size="A4" style={styles.page}>
        <ReportHeader meta={meta} />

        <View style={styles.headerRow}>
          {headers.map((header, index) => (
            <Text key={header} style={[styles.headerCell, { width: widths[index] }]}>
              {header}
            </Text>
          ))}
        </View>

        {rows.map((row, index) => (
          <View key={`${row.date}-${row.hostName}-${index}`} style={styles.row}>
            <Text style={[styles.cell, { width: widths[0] }]}>{row.date}</Text>
            <Text style={[styles.cell, { width: widths[1] }]}>{row.hostName}</Text>
            <Text style={[styles.cell, { width: widths[2] }]}>{row.shiftName}</Text>
            <Text style={[styles.cell, { width: widths[3] }]}>{formatCurrency(row.amount)}</Text>
            <Text style={[styles.cell, { width: widths[4] }]}>{row.note}</Text>
          </View>
        ))}

        <View style={styles.totalRow}>
          <Text style={[styles.bold, { width: "62%" }]}>Total {rows.length} laporan</Text>
          <Text style={[styles.bold, { width: "38%" }]}>{formatCurrency(total)}</Text>
        </View>

        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) => `Halaman ${pageNumber} dari ${totalPages}`}
          fixed
        />
      </Page>
    </Document>
  );
}

export function buildAttendancePdf(rows: AttendanceReportRow[], meta: ReportMeta) {
  return renderToBuffer(<AttendanceDocument rows={rows} meta={meta} />);
}

export function buildRevenuePdf(rows: RevenueReportRow[], meta: ReportMeta) {
  return renderToBuffer(<RevenueDocument rows={rows} meta={meta} />);
}
