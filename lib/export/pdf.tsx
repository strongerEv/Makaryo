import "server-only";

import { Document, Font, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";

import {
  groupAttendanceByHost,
  sumAttendance,
  type AttendanceReportRow,
  type HostAttendanceGroup,
  type ReportMeta,
  type RevenueReportRow,
} from "@/lib/export/queries";
import { formatCurrency } from "@/lib/utils/format";

// @react-pdf memenggal kata di ujung baris memakai aturan suku kata bahasa
// Inggris. Diterapkan ke bahasa Indonesia hasilnya salah — "sampai" terpotong
// jadi "sam-pai" — jadi penggalannya dimatikan dan kata yang tidak muat
// dipindahkan utuh ke baris berikutnya.
Font.registerHyphenationCallback((word) => [word]);

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
  hostName: { fontSize: 14, fontWeight: 700 },
  landscape: { padding: 28, fontSize: 9, color: "#1E2145" },
  hostMeta: { fontSize: 9, color: "#7C7F9E", marginTop: 3 },
  empty: { marginTop: 24, fontSize: 10, color: "#7C7F9E" },
});

function jamMenit(totalMenit: number) {
  return `${Math.floor(totalMenit / 60)}j ${totalMenit % 60}m`;
}

function Footer() {
  return (
    <Text
      style={styles.footer}
      render={({ pageNumber, totalPages }) => `Halaman ${pageNumber} dari ${totalPages}`}
      fixed
    />
  );
}

function TableHead({ headers, widths }: { headers: string[]; widths: string[] }) {
  return (
    <View style={styles.headerRow}>
      {headers.map((header, index) => (
        <Text key={header} style={[styles.headerCell, { width: widths[index] }]}>
          {header}
        </Text>
      ))}
    </View>
  );
}

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

/** Kolom tabel per orang — tanpa kolom "Host", karena namanya sudah jadi judul. */
const HOST_WIDTHS = ["13%", "9%", "13%", "8%", "8%", "10%", "5%", "11%", "23%"];
const HOST_HEADERS = [
  "Tanggal",
  "Shift",
  "Jam shift",
  "Clock in",
  "Clock out",
  "Status",
  "Telat",
  "Durasi",
  "Catatan",
];

function HostPage({ group, meta }: { group: HostAttendanceGroup; meta: ReportMeta }) {
  return (
    <Page size="A4" orientation="landscape" style={styles.landscape}>
      <View style={styles.headerBlock}>
        <Text style={styles.hostName}>{group.hostName}</Text>
        <Text style={styles.hostMeta}>
          Nomor rekening: {group.bankAccount || "belum diisi"}
        </Text>
        <Text style={styles.hostMeta}>
          {meta.title} · Periode {meta.periodLabel} · dibuat {meta.generatedAt} · Makaryo
        </Text>
      </View>

      <TableHead headers={HOST_HEADERS} widths={HOST_WIDTHS} />

      {group.rows.map((row, index) => (
        <View key={`${group.hostId}-${row.date}-${index}`} style={styles.row}>
          <Text style={[styles.cell, { width: HOST_WIDTHS[0] }]}>{row.date}</Text>
          <Text style={[styles.cell, { width: HOST_WIDTHS[1] }]}>{row.shiftName}</Text>
          <Text style={[styles.cell, { width: HOST_WIDTHS[2] }]}>{row.shiftHours}</Text>
          <Text style={[styles.cell, { width: HOST_WIDTHS[3] }]}>{row.clockIn}</Text>
          <Text style={[styles.cell, { width: HOST_WIDTHS[4] }]}>{row.clockOut}</Text>
          <Text style={[styles.cell, { width: HOST_WIDTHS[5] }]}>{row.status}</Text>
          <Text style={[styles.cell, { width: HOST_WIDTHS[6] }]}>{row.lateMinutes}</Text>
          <Text style={[styles.cell, { width: HOST_WIDTHS[7] }]}>{row.duration}</Text>
          <Text style={[styles.cell, { width: HOST_WIDTHS[8] }]}>{row.note}</Text>
        </View>
      ))}

      <View style={styles.totalRow}>
        <Text style={[styles.bold, { width: "22%" }]}>{group.totals.records} catatan</Text>
        <Text style={[styles.bold, { width: "26%" }]}>{group.totals.late} kali telat</Text>
        <Text style={[styles.bold, { width: "16%" }]}>{group.totals.lateMinutes} menit</Text>
        <Text style={[styles.bold, { width: "36%" }]}>{jamMenit(group.totals.workedMinutes)}</Text>
      </View>

      <Footer />
    </Page>
  );
}

/** Halaman pembuka: satu baris per host, supaya seluruh tim terbaca sekali lihat. */
function SummaryPage({ groups, meta }: { groups: HostAttendanceGroup[]; meta: ReportMeta }) {
  const widths = ["22%", "18%", "10%", "12%", "9%", "13%", "16%"];
  const headers = [
    "Host",
    "Nomor rekening",
    "Catatan",
    "Tepat waktu",
    "Telat",
    "Total telat",
    "Jam kerja",
  ];
  const semua = sumAttendance(groups.flatMap((group) => group.rows));

  return (
    <Page size="A4" orientation="landscape" style={styles.landscape}>
      <ReportHeader meta={meta} />

      <TableHead headers={headers} widths={widths} />

      {groups.map((group) => (
        <View key={group.hostId} style={styles.row}>
          <Text style={[styles.cell, { width: widths[0] }]}>{group.hostName}</Text>
          <Text style={[styles.cell, { width: widths[1] }]}>{group.bankAccount || "—"}</Text>
          <Text style={[styles.cell, { width: widths[2] }]}>{group.totals.records}</Text>
          <Text style={[styles.cell, { width: widths[3] }]}>{group.totals.onTime}</Text>
          <Text style={[styles.cell, { width: widths[4] }]}>{group.totals.late}</Text>
          <Text style={[styles.cell, { width: widths[5] }]}>{group.totals.lateMinutes} menit</Text>
          <Text style={[styles.cell, { width: widths[6] }]}>{jamMenit(group.totals.workedMinutes)}</Text>
        </View>
      ))}

      <View style={styles.totalRow}>
        <Text style={[styles.bold, { width: "40%" }]}>Total {groups.length} host</Text>
        <Text style={[styles.bold, { width: "10%" }]}>{semua.records}</Text>
        <Text style={[styles.bold, { width: "12%" }]}>{semua.onTime}</Text>
        <Text style={[styles.bold, { width: "9%" }]}>{semua.late}</Text>
        <Text style={[styles.bold, { width: "13%" }]}>{semua.lateMinutes} menit</Text>
        <Text style={[styles.bold, { width: "16%" }]}>{jamMenit(semua.workedMinutes)}</Text>
      </View>

      <Footer />
    </Page>
  );
}

/**
 * Rekap absensi: satu halaman bertabel per host.
 *
 * Satu tabel panjang berkolom "Host" memaksa pembacanya memindai baris demi
 * baris untuk menemukan satu orang, dan tidak bisa dipisah untuk diserahkan ke
 * yang bersangkutan. Tiap orang kini mulai di halaman baru, jadi lembarannya
 * bisa langsung dipotong per nama.
 */
function AttendanceDocument({
  rows,
  meta,
  bankAccounts,
}: {
  rows: AttendanceReportRow[];
  meta: ReportMeta;
  bankAccounts: Record<string, string>;
}) {
  const groups = groupAttendanceByHost(rows, bankAccounts);

  if (groups.length === 0) {
    return (
      <Document title={meta.title}>
        <Page size="A4" orientation="landscape" style={styles.landscape}>
          <ReportHeader meta={meta} />
          <Text style={styles.empty}>Tidak ada catatan absensi pada periode ini.</Text>
          <Footer />
        </Page>
      </Document>
    );
  }

  return (
    <Document title={meta.title}>
      {/* Ringkasan hanya berguna saat ada lebih dari satu orang untuk dibandingkan. */}
      {groups.length > 1 ? <SummaryPage groups={groups} meta={meta} /> : null}

      {groups.map((group) => (
        <HostPage key={group.hostId} group={group} meta={meta} />
      ))}
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

        <TableHead headers={headers} widths={widths} />

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

        <Footer />
      </Page>
    </Document>
  );
}

export function buildAttendancePdf(
  rows: AttendanceReportRow[],
  meta: ReportMeta,
  bankAccounts: Record<string, string> = {},
) {
  return renderToBuffer(<AttendanceDocument rows={rows} meta={meta} bankAccounts={bankAccounts} />);
}

export function buildRevenuePdf(rows: RevenueReportRow[], meta: ReportMeta) {
  return renderToBuffer(<RevenueDocument rows={rows} meta={meta} />);
}
