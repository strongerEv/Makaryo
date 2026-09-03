import { NextResponse, type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

/** Halaman yang boleh diakses tanpa masuk. */
const PUBLIC_PATHS = ["/login", "/daftar", "/lupa-password", "/auth"];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

/**
 * Middleware hanya mengurus satu hal: memastikan ada sesi.
 *
 * Pemeriksaan peran dan status akun sengaja tidak dilakukan di sini, melainkan
 * di layout masing-masing area lewat requireAdmin / requireHost. Middleware
 * berjalan pada setiap permintaan termasuk prefetch, jadi satu query database
 * di sini terasa sebagai jeda tiap kali berpindah halaman.
 */
export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const { pathname, search } = request.nextUrl;

  if (!user) {
    if (isPublic(pathname)) return response;

    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  // Sudah masuk tetapi membuka halaman tamu: biarkan halaman beranda yang
  // menentukan tujuannya, karena ia yang tahu peran dan status akunnya.
  if (isPublic(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // Route cron dikecualikan: pemanggilnya adalah Vercel Cron tanpa sesi pengguna,
  // dan route itu sudah dilindungi CRON_SECRET sendiri.
  matcher: [
    "/((?!api/cron|_next/static|_next/image|favicon.ico|icons|manifest.webmanifest|sw.js|.*\\.(?:svg|png|jpg|jpeg|webp|gif|ico|css|js)$).*)",
  ],
};
