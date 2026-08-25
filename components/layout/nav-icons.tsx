"use client";

import {
  Activity,
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

import type { NavIconName } from "@/components/layout/nav";

/** Pemetaan nama ikon menu ke komponennya, dipakai di sisi browser. */
export const NAV_ICONS: Record<NavIconName, LucideIcon> = {
  home: Home,
  calendar: CalendarDays,
  attendance: ScanFace,
  wallet: Wallet,
  requests: ClipboardList,
  profile: User,
  dashboard: LayoutDashboard,
  users: Users,
  inbox: Inbox,
  reports: FileBarChart,
  shift: Settings2,
  history: History,
  diagnostics: Activity,
};
