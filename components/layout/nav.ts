/**
 * Daftar menu untuk kedua peran.
 *
 * Ikon disimpan sebagai nama, bukan komponen. Kerangka aplikasi dirender di
 * server sementara navigasinya berjalan di browser, dan komponen tidak bisa
 * dikirim melintasi batas itu — pemetaan nama ke ikon ada di nav-icons.tsx.
 */
export type NavIconName =
  | "home"
  | "calendar"
  | "attendance"
  | "wallet"
  | "requests"
  | "profile"
  | "dashboard"
  | "users"
  | "inbox"
  | "reports"
  | "shift"
  | "history"
  | "diagnostics"
  | "demo";

export type NavItem = {
  href: string;
  label: string;
  icon: NavIconName;
  /** Ditampilkan di bottom nav mobile. */
  primary?: boolean;
};

export const HOST_NAV: NavItem[] = [
  { href: "/beranda", label: "Beranda", icon: "home", primary: true },
  { href: "/jadwal", label: "Jadwal", icon: "calendar", primary: true },
  { href: "/absen", label: "Absen", icon: "attendance", primary: true },
  { href: "/omzet", label: "Omzet", icon: "wallet", primary: true },
  { href: "/pengajuan", label: "Pengajuan", icon: "requests" },
  { href: "/profil", label: "Profil", icon: "profile", primary: true },
];

export const ADMIN_NAV: NavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/admin/pengguna", label: "Kelola Pengguna", icon: "users" },
  { href: "/admin/jadwal", label: "Jadwal", icon: "calendar" },
  { href: "/admin/approval", label: "Approval", icon: "inbox" },
  { href: "/admin/absensi", label: "Absensi", icon: "attendance" },
  { href: "/admin/omzet", label: "Omzet", icon: "wallet" },
  { href: "/admin/laporan", label: "Laporan", icon: "reports" },
  { href: "/admin/shift", label: "Pengaturan Shift", icon: "shift" },
  { href: "/admin/riwayat", label: "Riwayat Aktivitas", icon: "history" },
  { href: "/admin/diagnostik", label: "Diagnostik", icon: "diagnostics" },
  { href: "/admin/data-contoh", label: "Data Contoh", icon: "demo" },
];
