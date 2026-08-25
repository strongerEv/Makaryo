"use server";

import { revalidatePath } from "next/cache";

import { requireActiveProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function markNotificationReadAction(formData: FormData) {
  const profile = await requireActiveProfile();
  const notificationId = String(formData.get("notificationId") ?? "");
  if (!notificationId) return;

  const supabase = await createClient();
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", profile.id);

  revalidatePath("/notifikasi");
}

export async function markAllNotificationsReadAction() {
  const profile = await requireActiveProfile();

  const supabase = await createClient();
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", profile.id)
    .is("read_at", null);

  revalidatePath("/notifikasi");
}
