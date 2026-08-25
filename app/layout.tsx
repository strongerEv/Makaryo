import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";

import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Makaryo",
    template: "%s · Makaryo",
  },
  description:
    "Aplikasi manajemen karyawan host live streaming — absensi, jadwal shift, pengajuan izin, dan laporan omzet.",
  applicationName: "Makaryo",
};

export const viewport: Viewport = {
  themeColor: "#5b4ce0",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={jakarta.variable}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
