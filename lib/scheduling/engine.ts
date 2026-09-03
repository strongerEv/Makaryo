import { shiftEndInstant, shiftStartInstant } from "@/lib/attendance/time";
import { planRestDays } from "@/lib/scheduling/rest-days";
import { eachDate, weekStart } from "@/lib/utils/period";

export type SchedulingHost = {
  id: string;
  /** Jatah libur per minggu; sisanya adalah jumlah hari kerja maksimum. */
  weeklyDayOffQuota: number;
};

export type SchedulingShift = {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  minHosts: number;
  sortOrder: number;
};

export type SchedulingLeave = {
  hostId: string;
  date: string;
};

export type SchedulingAssignment = {
  hostId: string;
  shiftId: string;
  workDate: string;
};

export type SchedulingWarning = {
  work_date: string;
  shift_id: string;
  shift_name: string;
  assigned: number;
  required: number;
};

export type SchedulingInput = {
  startDate: string;
  endDate: string;
  hosts: SchedulingHost[];
  shifts: SchedulingShift[];
  /** Izin & libur yang sudah disetujui admin — batasan keras. */
  approvedLeaves?: SchedulingLeave[];
  /** Penugasan yang sudah ada di periode ini (mis. hasil edit manual admin). */
  existingAssignments?: SchedulingAssignment[];
  /** Jumlah shift yang sudah dijalani tiap host sebelum periode ini, untuk pemerataan. */
  previousWorkload?: Record<string, number>;
};

export type SchedulingResult = {
  assignments: SchedulingAssignment[];
  warnings: SchedulingWarning[];
};

/** Jeda istirahat minimum yang diusahakan antar shift berurutan (batasan lunak). */
const PREFERRED_REST_HOURS = 10;

type Interval = { start: number; end: number };

/**
 * Menyusun draft jadwal secara deterministik.
 *
 * Batasan keras (tidak pernah dilanggar):
 * - host yang sedang izin/libur disetujui tidak dijadwalkan
 * - satu host tidak pernah bertugas di dua shift yang waktunya bertumpuk
 * - jatah libur mingguan tiap host dihormati
 *
 * Batasan lunak (diusahakan, dilaporkan bila gagal):
 * - jumlah host minimum tiap shift terpenuhi
 * - beban shift dibagi merata antar host
 * - hindari tutup malam lalu buka pagi (jeda < 10 jam)
 */
export function generateSchedule(input: SchedulingInput): SchedulingResult {
  const dates = eachDate(input.startDate, input.endDate);
  const shifts = [...input.shifts].sort((a, b) => a.sortOrder - b.sortOrder || a.startTime.localeCompare(b.startTime));
  const hosts = [...input.hosts].sort((a, b) => a.id.localeCompare(b.id));

  const leaveKeys = new Set((input.approvedLeaves ?? []).map((leave) => `${leave.hostId}|${leave.date}`));

  // Hari libur ditentukan lebih dulu dan disebar merata, bukan dibiarkan
  // muncul sebagai sisa pengisian shift yang gampang menumpuk berurutan.
  const restPlan = planRestDays({
    startDate: input.startDate,
    endDate: input.endDate,
    hosts,
    approvedLeaveKeys: leaveKeys,
  });

  const totalLoad: Record<string, number> = {};
  const weeklyDays: Record<string, Set<string>> = {};
  const intervals: Record<string, Interval[]> = {};

  hosts.forEach((host) => {
    totalLoad[host.id] = input.previousWorkload?.[host.id] ?? 0;
    weeklyDays[host.id] = new Set();
    intervals[host.id] = [];
  });

  const result: SchedulingAssignment[] = [];
  const warnings: SchedulingWarning[] = [];

  const shiftById = new Map(shifts.map((shift) => [shift.id, shift]));
  const takenSlots = new Map<string, number>();

  // Penugasan manual yang sudah ada tetap dihormati dan ikut menghitung beban.
  (input.existingAssignments ?? []).forEach((assignment) => {
    const shift = shiftById.get(assignment.shiftId);
    if (!shift || !(assignment.hostId in totalLoad)) return;

    totalLoad[assignment.hostId] += 1;
    weeklyDays[assignment.hostId].add(`${weekStart(assignment.workDate)}|${assignment.workDate}`);
    intervals[assignment.hostId].push(toInterval(assignment.workDate, shift));

    const key = `${assignment.workDate}|${assignment.shiftId}`;
    takenSlots.set(key, (takenSlots.get(key) ?? 0) + 1);
  });

  for (const workDate of dates) {
    const week = weekStart(workDate);

    for (const shift of shifts) {
      const key = `${workDate}|${shift.id}`;
      const alreadyTaken = takenSlots.get(key) ?? 0;
      const needed = Math.max(0, shift.minHosts - alreadyTaken);

      if (needed === 0) {
        if (shift.minHosts > 0 && alreadyTaken < shift.minHosts) {
          warnings.push(buildWarning(workDate, shift, alreadyTaken));
        }
        continue;
      }

      const candidates = hosts
        .filter((host) =>
          isEligible(host, { workDate, week, shift, leaveKeys, restKeys: restPlan.keys, weeklyDays, intervals }),
        )
        .sort((a, b) => compareCandidates(a, b, { workDate, shift, totalLoad, weeklyDays, week, intervals }));

      const picked = candidates.slice(0, needed);

      picked.forEach((host) => {
        result.push({ hostId: host.id, shiftId: shift.id, workDate });
        totalLoad[host.id] += 1;
        weeklyDays[host.id].add(`${week}|${workDate}`);
        intervals[host.id].push(toInterval(workDate, shift));
      });

      const assigned = alreadyTaken + picked.length;
      if (assigned < shift.minHosts) {
        warnings.push(buildWarning(workDate, shift, assigned));
      }
    }
  }

  return { assignments: result, warnings };
}

function buildWarning(workDate: string, shift: SchedulingShift, assigned: number): SchedulingWarning {
  return {
    work_date: workDate,
    shift_id: shift.id,
    shift_name: shift.name,
    assigned,
    required: shift.minHosts,
  };
}

function toInterval(workDate: string, shift: SchedulingShift): Interval {
  return {
    start: shiftStartInstant(workDate, shift.startTime).getTime(),
    end: shiftEndInstant(workDate, shift.startTime, shift.endTime).getTime(),
  };
}

function isEligible(
  host: SchedulingHost,
  context: {
    workDate: string;
    week: string;
    shift: SchedulingShift;
    leaveKeys: Set<string>;
    restKeys: Set<string>;
    weeklyDays: Record<string, Set<string>>;
    intervals: Record<string, Interval[]>;
  },
) {
  const { workDate, week, shift, leaveKeys, restKeys, weeklyDays, intervals } = context;

  if (leaveKeys.has(`${host.id}|${workDate}`)) return false;
  if (restKeys.has(`${host.id}|${workDate}`)) return false;

  const candidate = toInterval(workDate, shift);
  const overlaps = intervals[host.id].some(
    (existing) => candidate.start < existing.end && existing.start < candidate.end,
  );
  if (overlaps) return false;

  const daysThisWeek = countDaysInWeek(weeklyDays[host.id], week);
  const alreadyWorkingToday = weeklyDays[host.id].has(`${week}|${workDate}`);
  const maxWorkDays = Math.max(0, 7 - Math.min(7, host.weeklyDayOffQuota));

  if (!alreadyWorkingToday && daysThisWeek >= maxWorkDays) return false;

  return true;
}

function compareCandidates(
  a: SchedulingHost,
  b: SchedulingHost,
  context: {
    workDate: string;
    shift: SchedulingShift;
    totalLoad: Record<string, number>;
    weeklyDays: Record<string, Set<string>>;
    week: string;
    intervals: Record<string, Interval[]>;
  },
) {
  const { totalLoad, weeklyDays, week, workDate, shift, intervals } = context;

  const loadDiff = totalLoad[a.id] - totalLoad[b.id];
  if (loadDiff !== 0) return loadDiff;

  const weekDiff = countDaysInWeek(weeklyDays[a.id], week) - countDaysInWeek(weeklyDays[b.id], week);
  if (weekDiff !== 0) return weekDiff;

  const restDiff = restPenalty(intervals[a.id], workDate, shift) - restPenalty(intervals[b.id], workDate, shift);
  if (restDiff !== 0) return restDiff;

  return a.id.localeCompare(b.id);
}

/** 1 bila host baru saja menutup shift kurang dari jeda istirahat yang dianjurkan. */
function restPenalty(existing: Interval[], workDate: string, shift: SchedulingShift) {
  const candidate = toInterval(workDate, shift);
  const restMs = PREFERRED_REST_HOURS * 60 * 60 * 1000;

  return existing.some((interval) => {
    const gap = candidate.start - interval.end;
    return gap >= 0 && gap < restMs;
  })
    ? 1
    : 0;
}

function countDaysInWeek(days: Set<string>, week: string) {
  let count = 0;
  days.forEach((entry) => {
    if (entry.startsWith(`${week}|`)) count += 1;
  });
  return count;
}
