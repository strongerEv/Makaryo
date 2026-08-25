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

export type AttendanceStatus = "on_time" | "late" | "absent";
export type ScheduleStatus = "draft" | "published" | "cancelled";
export type LeaveType = "weekly_off" | "urgent";
export type LeaveStatus = "pending" | "approved" | "rejected";

export type Attendance = {
  id: string;
  host_id: string;
  assignment_id: string | null;
  work_date: string;
  clock_in_at: string | null;
  clock_in_photo: string | null;
  clock_in_lat: number | null;
  clock_in_lng: number | null;
  clock_out_at: string | null;
  clock_out_photo: string | null;
  clock_out_lat: number | null;
  clock_out_lng: number | null;
  status: AttendanceStatus;
  late_minutes: number;
  worked_minutes: number;
  auto_closed: boolean;
  note: string | null;
  recorded_by: string | null;
  created_at: string;
  updated_at: string;
};

export type SchedulePeriod = {
  id: string;
  start_date: string;
  end_date: string;
  status: ScheduleStatus;
  generated_at: string | null;
  published_at: string | null;
  published_by: string | null;
  warnings: ScheduleWarning[] | null;
  created_at: string;
};

export type ScheduleWarning = {
  work_date: string;
  shift_id: string;
  shift_name: string;
  assigned: number;
  required: number;
};

export type ScheduleAssignment = {
  id: string;
  period_id: string | null;
  host_id: string;
  shift_id: string;
  work_date: string;
  status: ScheduleStatus;
  source: "auto" | "manual";
  created_at: string;
  updated_at: string;
};

export type LeaveRequest = {
  id: string;
  host_id: string;
  type: LeaveType;
  requested_date: string;
  reason: string | null;
  status: LeaveStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  created_at: string;
};

export type RevenueReport = {
  id: string;
  host_id: string;
  shift_id: string | null;
  work_date: string;
  amount: number;
  proof_url: string | null;
  note: string | null;
  submitted_by: string | null;
  created_at: string;
  updated_at: string;
};

export type AppNotification = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

export const ATTENDANCE_STATUS_LABEL: Record<AttendanceStatus, string> = {
  on_time: "Tepat waktu",
  late: "Telat",
  absent: "Tidak absen",
};

export const LEAVE_TYPE_LABEL: Record<LeaveType, string> = {
  weekly_off: "Libur mingguan",
  urgent: "Izin mendadak",
};

export const LEAVE_STATUS_LABEL: Record<LeaveStatus, string> = {
  pending: "Menunggu",
  approved: "Disetujui",
  rejected: "Ditolak",
};
