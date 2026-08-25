import { redirect } from "next/navigation";

import { getCurrentProfile, homePathFor } from "@/lib/auth/session";

export default async function RootPage() {
  const profile = await getCurrentProfile();
  redirect(profile ? homePathFor(profile) : "/login");
}
