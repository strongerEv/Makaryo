import { NextResponse, type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

/** Halaman yang boleh diakses tanpa masuk. */
const PUBLIC_PATHS = ["/login", "/daftar", "/lupa-password", "/auth"];

/** Satu-satunya halaman untuk akun yang belum aktif. */
const GATE_PATH = "/menunggu-verifikasi";

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export async function middleware(request: NextRequest) {
  const { supabase, response, user } = await updateSession(request);
  const { pathname, search } = request.nextUrl;

  const redirectTo = (path: string) => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    url.search = "";
    return NextResponse.redirect(url);
  };

  if (!user) {
    if (isPublic(pathname)) return response;
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, account_status")
    .eq("id", user.id)
    .single();

  // Profil belum terbentuk (jeda trigger) — perlakukan seperti akun menunggu verifikasi.
  const accountStatus = profile?.account_status ?? "pending";
  const role = profile?.role ?? "host";
  const home = role === "admin" ? "/admin/dashboard" : "/beranda";

  if (accountStatus !== "active") {
    return pathname === GATE_PATH ? response : redirectTo(GATE_PATH);
  }

  if (isPublic(pathname) || pathname === GATE_PATH || pathname === "/") {
    return redirectTo(home);
  }

  if (role !== "admin" && pathname.startsWith("/admin")) {
    return redirectTo("/beranda");
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|webp|gif|ico|css|js)$).*)"],
};
