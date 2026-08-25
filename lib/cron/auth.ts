import "server-only";

import type { NextRequest } from "next/server";

/**
 * Route cron dilindungi CRON_SECRET. Vercel Cron mengirimkannya sebagai bearer token.
 * Bila secret belum diatur, akses ditolak agar tidak bisa dipanggil sembarang orang.
 */
export function isAuthorizedCron(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const header = request.headers.get("authorization");
  return header === `Bearer ${secret}`;
}
