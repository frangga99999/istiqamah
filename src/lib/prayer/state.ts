import type { PrayerState } from "@/lib/types";

export interface StateInput {
  start: Date; // prayer time enters
  windowEnd: Date; // next prayer's start = this window closes
  now: Date;
  performedAt: Date | null;
  leadTimeMin: number; // minutes before start → enter PREPARATION (from engine)
  lateRiskAfterMin: number; // minutes after start with no check-in → LATE_RISK
}

// PRD §21–26. Pure: state is a function of the clock + the log, nothing else.
export function prayerState(i: StateInput): PrayerState {
  if (i.performedAt) return "COMPLETED";

  const now = i.now.getTime();
  const start = i.start.getTime();

  if (now < start) {
    return now >= start - i.leadTimeMin * 60_000 ? "PREPARATION" : "UPCOMING";
  }
  if (now >= i.windowEnd.getTime()) return "MISSED";
  if (now >= start + i.lateRiskAfterMin * 60_000) return "LATE_RISK";
  return "PRAYER_TIME";
}

export function minutesUntil(target: Date, now = new Date()): number {
  return Math.round((target.getTime() - now.getTime()) / 60_000);
}

export function minutesSince(target: Date, now = new Date()): number {
  return Math.round((now.getTime() - target.getTime()) / 60_000);
}
