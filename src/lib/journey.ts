// Weekly metrics + promotion logic for the Journey screen (PRD §52–57, §64).
import { PRAYERS, type BehaviorProfile, type Goal, type PrayerLog, type PrayerName } from "@/lib/types";
import { PRAYER_LABEL } from "@/lib/types";
import { buildProfile, classifyQuality, delayMinutes, THRESHOLDS } from "@/lib/engine/profile";
import { buildGoal } from "@/lib/focus";
import type { AppState } from "@/lib/store";

export interface WeekMetrics {
  expected: number; // days * 5
  completed: number;
  onTime: number; // delay <= onTime threshold
  mosque: number;
  sunnah: number;
  avgDelay: number | null;
}

// Date keys (YYYY-MM-DD) for `count` days ending at `endKey` (inclusive), tz-aware.
function daysBack(tz: string, count: number, offset: number): string[] {
  const fmt = (d: Date) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  const now = new Date();
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - (i + offset));
    out.push(fmt(d));
  }
  return out;
}

function metrics(logs: PrayerLog[], dateKeys: Set<string>): WeekMetrics {
  const inWin = logs.filter((l) => dateKeys.has(l.date));
  const performed = inWin.filter((l) => l.performed_at);
  const delays = performed.map((l) => delayMinutes(l)!).filter((d) => d >= 0);
  return {
    expected: dateKeys.size * 5,
    completed: performed.length,
    onTime: performed.filter((l) => {
      const q = classifyQuality(l);
      return q === "EARLY" || q === "ON_TIME";
    }).length,
    mosque: performed.filter((l) => l.performed_location === "mosque").length,
    sunnah: inWin.reduce((s, l) => s + (l.sunnah_before ? 1 : 0) + (l.sunnah_after ? 1 : 0), 0),
    avgDelay: delays.length ? Math.round(delays.reduce((s, x) => s + x, 0) / delays.length) : null,
  };
}

function avgDelayForPrayer(logs: PrayerLog[], prayer: PrayerName, keys: Set<string>): number | null {
  const ds = logs
    .filter((l) => l.prayer === prayer && keys.has(l.date) && l.performed_at)
    .map((l) => delayMinutes(l)!)
    .filter((d) => d >= 0);
  return ds.length ? Math.round(ds.reduce((s, x) => s + x, 0) / ds.length) : null;
}

// PRD §57 — is the current focus met well enough to offer a harder target?
function adherence(state: AppState, thisKeys: Set<string>): { rate: number; samples: number } {
  const { goal, logs } = state;
  const inWin = logs.filter((l) => thisKeys.has(l.date) && l.performed_at);
  if (!goal) return { rate: 0, samples: 0 };
  if (goal.goal_type === "keep_five") {
    return { rate: inWin.length / (thisKeys.size * 5), samples: thisKeys.size * 5 };
  }
  if (goal.goal_type === "mosque") {
    const set = goal.prayer ? inWin.filter((l) => l.prayer === goal.prayer) : inWin;
    return { rate: ratio(set, (l) => l.performed_location === "mosque"), samples: set.length };
  }
  if (goal.goal_type === "reduce_delay") {
    const set = goal.prayer ? inWin.filter((l) => l.prayer === goal.prayer) : inWin;
    const t = goal.target_value ?? THRESHOLDS.onTime;
    return { rate: ratio(set, (l) => (delayMinutes(l) ?? 999) <= t), samples: set.length };
  }
  // pray_earlier
  return { rate: ratio(inWin, (l) => classifyQuality(l) === "EARLY"), samples: inWin.length };
}

function ratio<T>(arr: T[], pred: (x: T) => boolean): number {
  return arr.length ? arr.filter(pred).length / arr.length : 0;
}

// PRD §55/§56 — the next focus up the ladder once the current one is held.
export function nextGoal(current: Goal): Goal {
  switch (current.goal_type) {
    case "keep_five":
      return buildGoal("reduce_delay", "asr", 20);
    case "reduce_delay":
    case "pray_earlier":
      return buildGoal("mosque", "maghrib");
    case "mosque":
      return current.prayer === "maghrib" ? buildGoal("mosque", "isha") : buildGoal("sunnah", "fajr");
    default:
      return current; // top of the MVP ladder
  }
}

export interface JourneyView {
  focus: Goal | null;
  week: WeekMetrics;
  prev: WeekMetrics;
  delayDelta: number | null; // prev.avgDelay - week.avgDelay (positive = improved)
  mostImproved: { prayer: PrayerName; from: number; to: number } | null;
  promotion: { ready: boolean; rate: number; next: Goal } | null;
  perPrayer: BehaviorProfile[]; // one per prayer, for the comparison chart
}

export function computeJourney(state: AppState): JourneyView {
  const tz = state.settings?.timezone ?? "Asia/Jakarta";
  const thisKeys = new Set(daysBack(tz, 7, 0));
  const prevKeys = new Set(daysBack(tz, 7, 7));

  const week = metrics(state.logs, thisKeys);
  const prev = metrics(state.logs, prevKeys);
  const delayDelta =
    week.avgDelay != null && prev.avgDelay != null ? prev.avgDelay - week.avgDelay : null;

  // Most-improved prayer by delay drop (PRD §64).
  let mostImproved: JourneyView["mostImproved"] = null;
  for (const p of PRAYERS) {
    const a = avgDelayForPrayer(state.logs, p, prevKeys);
    const b = avgDelayForPrayer(state.logs, p, thisKeys);
    if (a == null || b == null) continue;
    if (a - b > 2 && (!mostImproved || a - b > mostImproved.from - mostImproved.to)) {
      mostImproved = { prayer: p, from: a, to: b };
    }
  }

  let promotion: JourneyView["promotion"] = null;
  if (state.goal) {
    const { rate, samples } = adherence(state, thisKeys);
    promotion = { ready: rate >= 0.8 && samples >= 5, rate, next: nextGoal(state.goal) };
  }

  const perPrayer = PRAYERS.map((p) => buildProfile(p, state.logs));

  return { focus: state.goal, week, prev, delayDelta, mostImproved, promotion, perPrayer };
}

export { PRAYER_LABEL };
