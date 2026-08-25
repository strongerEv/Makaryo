import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** Menyimpan langganan web push milik pengguna yang sedang masuk. */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Tidak diizinkan." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const endpoint = body?.endpoint as string | undefined;
  const p256dh = body?.keys?.p256dh as string | undefined;
  const auth = body?.keys?.auth as string | undefined;

  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "Data langganan tidak lengkap." }, { status: 400 });
  }

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint,
      p256dh,
      auth,
      user_agent: request.headers.get("user-agent"),
    },
    { onConflict: "endpoint" },
  );

  if (error) return NextResponse.json({ error: "Gagal menyimpan langganan." }, { status: 500 });

  return NextResponse.json({ ok: true });
}

/** Menghapus langganan saat pengguna mematikan notifikasi. */
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Tidak diizinkan." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const endpoint = body?.endpoint as string | undefined;
  if (!endpoint) return NextResponse.json({ error: "Endpoint wajib diisi." }, { status: 400 });

  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint).eq("user_id", user.id);

  return NextResponse.json({ ok: true });
}
