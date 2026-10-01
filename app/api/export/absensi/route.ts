import { NextResponse, type NextRequest } from "next/server";

import { buildAttendanceWorkbook } from "@/lib/export/excel";
import { buildAttendancePdf } from "@/lib/export/pdf";
import { fetchAttendanceReport } from "@/lib/export/queries";
import { createClient } from "@/lib/supabase/server";
import { currentMonth } from "@/lib/utils/period";
import { isAdminRole } from "@/lib/types/database";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Tidak diizinkan." }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role, account_status").eq("id", user.id).single();
  if (!profile || !isAdminRole(profile.role) || profile.account_status !== "active") {
    return NextResponse.json({ error: "Hanya admin yang dapat mengunduh laporan." }, { status: 403 });
  }

  const format = request.nextUrl.searchParams.get("format") === "pdf" ? "pdf" : "xlsx";
  const month = request.nextUrl.searchParams.get("bulan") ?? currentMonth();
  const hostId = request.nextUrl.searchParams.get("host") ?? "all";

  const { rows, meta, bankAccounts } = await fetchAttendanceReport(supabase, { month, hostId });

  // Berkas satu host diberi namanya, bukan penanda "-per-host" yang kini justru
  // menyesatkan: berkas untuk semua host pun sudah dipecah per orang di dalamnya.
  const slug = meta.hostLabel
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const fileName = `laporan-absensi-${month}${hostId === "all" ? "" : `-${slug}`}.${format}`;

  const body =
    format === "pdf"
      ? await buildAttendancePdf(rows, meta, bankAccounts)
      : await buildAttendanceWorkbook(rows, meta, bankAccounts);

  return new NextResponse(new Uint8Array(body), {
    headers: {
      "Content-Type":
        format === "pdf"
          ? "application/pdf"
          : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
