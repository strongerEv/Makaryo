import { NextResponse, type NextRequest } from "next/server";

import { shiftStartInstant } from "@/lib/attendance/time";
import { isAuthorizedCron } from "@/lib/cron/auth";
import { notifyUsers } from "@/lib/notifications/notify";
import { crossedReminderStages, reminderLabel } from "@/lib/notifications/reminder";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Shift } from "@/lib/types/database";
import { formatClock, todayInJakarta } from "@/lib/utils/datetime";
import { addDays } from "@/lib/utils/period";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Mengirim pengingat jam kerja.
 *
 * Route ini sengaja tidak mengasumsikan jeda pemanggilan tertentu: ia mencatat
 * setiap tahap yang sudah terlampaui, lalu mengirim paling banyak satu notifikasi
 * per penugasan dengan sisa waktu yang sebenarnya. Jadi pemanggilnya boleh tiap
 * 5 menit, tiap 10 menit, atau telat sekalipun — pengingat tidak hilang dan
 * tidak pernah terkirim dua kali.
 */
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

    // Kosong berarti shift sudah dimulai atau masih terlalu jauh untuk diingatkan.
    const crossed = crossedReminderStages(minutesUntil);
    if (crossed.length === 0) continue;

    let hasNewStage = false;

    for (const offset of crossed) {
      // Penanda pengiriman bersifat unik, jadi tahap yang sudah pernah
      // terkirim akan gagal disisipkan dan otomatis dilewati.
      const { error } = await admin
        .from("notification_deliveries")
        .insert({ assignment_id: assignment.id as string, offset_minutes: offset });

      if (!error) hasNewStage = true;
    }

    if (!hasNewStage) continue;

    const label = reminderLabel(minutesUntil);

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
