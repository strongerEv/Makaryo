import { NextResponse, type NextRequest } from "next/server";

import { shiftStartInstant } from "@/lib/attendance/time";
import { isAuthorizedCron } from "@/lib/cron/auth";
import { notifyUsers } from "@/lib/notifications/notify";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Shift } from "@/lib/types/database";
import { formatClock, todayInJakarta } from "@/lib/utils/datetime";
import { addDays } from "@/lib/utils/period";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Pengingat dikirim pada H-1 jam, H-30 menit, dan H-15 menit. */
const OFFSETS = [60, 30, 15];

/** Cron berjalan tiap 5 menit, jadi tiap offset punya jendela 5 menit. */
const WINDOW_MINUTES = 5;

export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "Tidak diizinkan." }, { status: 401 });
  }

  const admin = createAdminClient();
  const today = todayInJakarta();
  const tomorrow = addDays(today, 1);

  const { data: assignments } = await admin
    .from("schedule_assignments")
    .select("id, host_id, work_date, shifts(name, start_time, end_time)")
    .eq("status", "published")
    .in("work_date", [today, tomorrow]);

  const now = Date.now();
  let sent = 0;

  for (const assignment of assignments ?? []) {
    const shift = assignment.shifts as unknown as Pick<Shift, "name" | "start_time"> | null;
    if (!shift) continue;

    const startsAt = shiftStartInstant(assignment.work_date as string, shift.start_time).getTime();
    const minutesUntil = (startsAt - now) / 60_000;

    const offset = OFFSETS.find(
      (value) => minutesUntil <= value && minutesUntil > value - WINDOW_MINUTES,
    );
    if (!offset) continue;

    // Penanda pengiriman menjaga agar satu pengingat tidak terkirim dua kali.
    const { error } = await admin
      .from("notification_deliveries")
      .insert({ assignment_id: assignment.id as string, offset_minutes: offset });

    if (error) continue;

    const label = offset >= 60 ? "1 jam lagi" : `${offset} menit lagi`;

    await notifyUsers({
      userIds: [assignment.host_id as string],
      type: "reminder",
      title: `${shift.name} dimulai ${label}`,
      body: `Shift kamu mulai pukul ${formatClock(shift.start_time)} WIB. Siapkan diri dan jangan lupa clock in.`,
      link: "/absen",
      urgent: true,
    });

    sent += 1;
  }

  return NextResponse.json({ ok: true, sent });
}
