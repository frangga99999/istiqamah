import type { BehaviorProfile, PrayerLog, PrayerName, PrayerQuality, RiskLevel } from "@/lib/types";

// Quality thresholds (minutes of delay). Centralised so analytics + engine agree.
export const THRESHOLDS = {
  early: 5, // performed within 5m of adzan → EARLY (dekat awal waktu)
  onTime: 20, // within 20m → ON_TIME
  // beyond onTime but still performed in-window → LATE_RISK
  minSample: 5, // PRD §39 — don't trust computed risk under this many samples
  recentWindow: 7, // PRD §40 rolling windows
} as const;

export function delayMinutes(log: PrayerLog): number | null {
  if (!log.performed_at) return null;
  return Math.round(
    (new Date(log.performed_at).getTime() - new Date(log.prayer_start_at).getTime()) / 60_000,
  );
}

export function classifyQuality(log: PrayerLog): PrayerQuality {
  const d = delayMinutes(log);
  if (d === null) return "MISSED";
  if (d <= THRESHOLDS.early) return "EARLY";
  if (d <= THRESHOLDS.onTime) return "ON_TIME";
  return "LATE_RISK";
}

// PRD §40 — weight recent behaviour above older behaviour (70/30 across two windows).
function recencyWeightedMean(valuesRecentFirst: number[]): number {
  if (valuesRecentFirst.length === 0) return 0;
  const w = THRESHOLDS.recentWindow;
  const recent = valuesRecentFirst.slice(0, w);
  const prev = valuesRecentFirst.slice(w, w * 2);
  const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length;
  if (prev.length === 0) return mean(recent);
  return mean(recent) * 0.7 + mean(prev) * 0.3;
}

// PRD §36 — deterministic, explainable risk from delay + recent lateness + consistency.
export function computeRisk(avgDelay: number, lateRate: number, consistency: number): RiskLevel {
  let score = 0;
  // delay component
  if (avgDelay > 30) score += 3;
  else if (avgDelay > 20) score += 2;
  else if (avgDelay > 10) score += 1;
  // recent lateness component (fraction of recent prayers that ran late)
  score += Math.round(lateRate * 2); // 0..2
  // consistency drop component
  if (consistency < 0.4) score += 2;
  else if (consistency < 0.7) score += 1;

  if (score >= 5) return "VERY_HIGH";
  if (score >= 3) return "HIGH";
  if (score >= 1) return "MEDIUM";
  return "LOW";
}

// Build the rolling profile for one prayer from its logs (any order).
export function buildProfile(prayer: PrayerName, logs: PrayerLog[]): BehaviorProfile {
  const forPrayer = logs
    .filter((l) => l.prayer === prayer)
    .sort((a, b) => b.date.localeCompare(a.date)); // recent first

  const performed = forPrayer.filter((l) => l.performed_at);
  const delays = performed.map((l) => delayMinutes(l)!).filter((d) => d >= 0);
  const preps = performed
    .filter((l) => l.preparation_started_at && l.performed_at)
    .map((l) =>
      Math.round(
        (new Date(l.performed_at!).getTime() - new Date(l.preparation_started_at!).getTime()) / 60_000,
      ),
    )
    .filter((m) => m >= 0);

  const avgDelay = Math.round(recencyWeightedMean(delays));
  const avgPrep = preps.length ? Math.round(recencyWeightedMean(preps)) : 0;

  const recent = forPrayer.slice(0, THRESHOLDS.recentWindow);
  const lateRate = recent.length
    ? recent.filter((l) => {
        const q = classifyQuality(l);
        return q === "LATE_RISK" || q === "MISSED";
      }).length / recent.length
    : 0;
  const consistency = recent.length
    ? recent.filter((l) => {
        const q = classifyQuality(l);
        return q === "EARLY" || q === "ON_TIME";
      }).length / recent.length
    : 0;

  const risk = performed.length >= THRESHOLDS.minSample ? computeRisk(avgDelay, lateRate, consistency) : "MEDIUM";

  return {
    prayer,
    average_delay: avgDelay,
    average_preparation_time: avgPrep,
    optimal_lead_time: 0, // filled by the reminder planner
    risk_level: risk,
    consistency_score: Number(consistency.toFixed(2)),
    sample_size: performed.length,
  };
}
