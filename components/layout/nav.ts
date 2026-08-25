import {
  CalendarDays,
  ClipboardList,
  FileBarChart,
  History,
  Home,
  Inbox,
  LayoutDashboard,
  ScanFace,
  Settings2,
  User,
  Users,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Ditampilkan di bottom nav mobile. */
  primary?: boolean;
};

export const HOST_NAV: NavItem[] = [
  { href: "/beranda", label: "Beranda", icon: Home, primary: true },
  { href: "/jadwal", label: "Jadwal", icon: CalendarDays, primary: true },
  { href: "/absen", label: "Absen", icon: ScanFace, primary: true },
  { href: "/omzet", label: "Omzet", icon: Wallet, primary: true },
  { href: "/pengajuan", label: "Pengajuan", icon: ClipboardList },
  { href: "/profil", label: "Profil", icon: User, primary: true },
];

export const ADMIN_NAV: NavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/pengguna", label: "Kelola Pengguna", icon: Users },
  { href: "/admin/jadwal", label: "Jadwal", icon: CalendarDays },
  { href: "/admin/approval", label: "Approval", icon: Inbox },
  { href: "/admin/absensi", label: "Absensi", icon: ScanFace },
  { href: "/admin/omzet", label: "Omzet", icon: Wallet },
  { href: "/admin/laporan", label: "Laporan", icon: FileBarChart },
  { href: "/admin/shift", label: "Pengaturan Shift", icon: Settings2 },
  { href: "/admin/riwayat", label: "Riwayat Aktivitas", icon: History },
];
