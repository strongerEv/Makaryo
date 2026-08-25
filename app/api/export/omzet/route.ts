import { NextResponse, type NextRequest } from "next/server";

import { buildRevenueWorkbook } from "@/lib/export/excel";
import { buildRevenuePdf } from "@/lib/export/pdf";
import { fetchRevenueReport } from "@/lib/export/queries";
import { createClient } from "@/lib/supabase/server";
import { currentMonth } from "@/lib/utils/period";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Tidak diizinkan." }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role, account_status").eq("id", user.id).single();
  if (profile?.role !== "admin" || profile.account_status !== "active") {
    return NextResponse.json({ error: "Hanya admin yang dapat mengunduh laporan." }, { status: 403 });
  }

  const format = request.nextUrl.searchParams.get("format") === "pdf" ? "pdf" : "xlsx";
  const month = request.nextUrl.searchParams.get("bulan") ?? currentMonth();
  const hostId = request.nextUrl.searchParams.get("host") ?? "all";

  const { rows, meta } = await fetchRevenueReport(supabase, { month, hostId });
  const fileName = `laporan-omzet-${month}${hostId === "all" ? "" : "-per-host"}.${format}`;

  const body =
    format === "pdf" ? await buildRevenuePdf(rows, meta) : await buildRevenueWorkbook(rows, meta);

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
