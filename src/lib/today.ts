// Pure view-model for Home/Today (PRD §19–26). Ties schedule + logs + engine
// together so the screen component stays presentational.
import { PRAYERS, type PrayerLog, type PrayerName, type PrayerState } from "@/lib/types";
import type { AppState } from "@/lib/store";
import {
  nextPrayer,
  previousPrayerAt,
  scheduleForDay,
  tomorrowFajr,
  localDateKey,
  type NextPrayer,
} from "@/lib/prayer/times";
import { prayerState } from "@/lib/prayer/state";
import { buildProfile, THRESHOLDS } from "@/lib/engine/profile";
import { planReminder, type ReminderPlan } from "@/lib/engine/adaptive";
import { targetLabel } from "@/lib/focus";

export interface PrayerRow {
  prayer: PrayerName;
  at: Date;
  state: PrayerState;
  log?: PrayerLog;
}

export interface HeroFocus {
  prayer: PrayerName;
  at: Date;
  state: PrayerState;
  isNow: boolean; // time already entered, awaiting check-in
  isTomorrow: boolean; // all of today handled → hero is tomorrow's Fajr
}

export interface TodayView {
  date: string;
  rows: PrayerRow[];
  next: NextPrayer;
  hero: HeroFocus;
  intervalStart: Date; // start of the current inter-prayer window (for the ring)
  prepAt: Date; // when preparation should begin (hero.at − primaryLead)
  target: { mosque: boolean; label: string };
  plan: ReminderPlan;
  prepInMinutes: number; // minutes until PREPARATION should start (<=0 = now)
  completed: number;
  mosqueCount: number;
}

// What the Home hero leads with: the most urgent unlogged prayer, else next upcoming.
function pickHero(rows: PrayerRow[], next: NextPrayer): HeroFocus {
  const byUrgency: PrayerState[] = ["LATE_RISK", "PRAYER_TIME", "PREPARATION"];
  for (const s of byUrgency) {
    const r = rows.find((row) => row.state === s);
    if (r) return { prayer: r.prayer, at: r.at, state: r.state, isNow: s !== "PREPARATION", isTomorrow: false };
  }
  return { prayer: next.prayer, at: next.at, state: "UPCOMING", isNow: false, isTomorrow: next.isTomorrow };
}

// Is the next prayer a mosque target, given goal + preference (PRD §44/§107)?
function isMosqueTarget(state: AppState, prayer: PrayerName): boolean {
  const { goal, prefs } = state;
  if (!prefs.mosque_priority) return false;
  if (goal?.goal_type !== "mosque") return false;
  return !goal.prayer || goal.prayer === prayer;
}

function leadFor(state: AppState, prayer: PrayerName, mosque: boolean): ReminderPlan {
  const profile = buildProfile(prayer, state.logs);
  if (!state.prefs.adaptive_reminders && state.prefs.manual_lead_minutes != null) {
    const m = state.prefs.manual_lead_minutes;
    return {
      prayer,
      leadTimes: [...new Set([m, 0])].sort((a, b) => b - a),
      primaryLead: m,
      risk: profile.risk_level,
      followUp: false,
      reason: `Pengingat manual ${m} menit sebelum waktu ${prayer}.`,
    };
  }
  return planReminder({
    profile,
    assistance: state.prefs.assistance,
    mosqueTarget: mosque,
    maxReminders: state.prefs.max_reminders,
  });
}

export function buildToday(state: AppState, now = new Date()): TodayView | null {
  if (!state.settings) return null;
  const settings = state.settings;
  const schedule = scheduleForDay(settings, now);
  const date = schedule.date;

  // window ends: each prayer closes when the next one enters; Isha → tomorrow Fajr.
  const starts = PRAYERS.map((p) => new Date(schedule.times[p]));
  const tmrFajr = tomorrowFajr(settings, now);

  const rows: PrayerRow[] = PRAYERS.map((prayer, i) => {
    const log = state.logs.find((l) => l.date === date && l.prayer === prayer);
    const mosque = isMosqueTarget(state, prayer);
    const plan = leadFor(state, prayer, mosque);
    const lateRiskAfter = state.goal?.goal_type === "reduce_delay" ? state.goal.target_value ?? THRESHOLDS.onTime : THRESHOLDS.onTime;
    const s = prayerState({
      start: starts[i],
      windowEnd: i < 4 ? starts[i + 1] : tmrFajr,
      now,
      performedAt: log?.performed_at ? new Date(log.performed_at) : null,
      leadTimeMin: plan.primaryLead,
      lateRiskAfterMin: lateRiskAfter,
    });
    return { prayer, at: starts[i], state: s, log };
  });

  const next = nextPrayer(schedule, settings, now);
  const hero = pickHero(rows, next);
  // Target / reminder plan describe the prayer the hero is showing.
  const mosque = isMosqueTarget(state, hero.prayer);
  const plan = leadFor(state, hero.prayer, mosque);
  const prepStart = new Date(hero.at.getTime() - plan.primaryLead * 60_000);
  const prepInMinutes = Math.round((prepStart.getTime() - now.getTime()) / 60_000);
  const intervalStart = previousPrayerAt(settings, now);

  const todays = state.logs.filter((l) => l.date === date && l.performed_at);
  const completed = todays.length;
  const mosqueCount = todays.filter((l) => l.performed_location === "mosque").length;

  return {
    date,
    rows,
    next,
    hero,
    intervalStart,
    prepAt: prepStart,
    target: { mosque, label: targetLabel(state.goal, mosque) },
    plan,
    prepInMinutes,
    completed,
    mosqueCount,
  };
}

export { localDateKey };
