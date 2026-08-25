export type UserRole = "admin" | "host";
export type AccountStatus = "pending" | "active" | "rejected" | "suspended";
export type EmploymentStatus = "active" | "inactive" | "long_leave";

export type Profile = {
  id: string;
  role: UserRole;
  account_status: AccountStatus;
  account_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  address: string | null;
  birth_date: string | null;
  join_date: string | null;
  employment_status: EmploymentStatus;
  bank_account: string | null;
  weekly_day_off_quota: number;
  created_at: string;
  updated_at: string;
};

export type Shift = {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  min_hosts: number;
  color: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type AppSettings = {
  id: number;
  weekly_off_request_open: boolean;
  weekly_off_request_period: string | null;
  late_tolerance_minutes: number;
  operational_start: string;
  operational_end: string;
  updated_at: string;
};

export type AuditLog = {
  id: string;
  actor_id: string | null;
  entity: string;
  entity_id: string | null;
  action: string;
  target_user_id: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  created_at: string;
};

export const ACCOUNT_STATUS_LABEL: Record<AccountStatus, string> = {
  pending: "Menunggu verifikasi",
  active: "Aktif",
  rejected: "Ditolak",
  suspended: "Dinonaktifkan",
};

export const EMPLOYMENT_STATUS_LABEL: Record<EmploymentStatus, string> = {
  active: "Aktif",
  inactive: "Nonaktif",
  long_leave: "Cuti panjang",
};

export const ROLE_LABEL: Record<UserRole, string> = {
  admin: "Admin",
  host: "Host",
};
