import type { AssistanceLevel, BehaviorProfile, PrayerName, RiskLevel } from "@/lib/types";
import { PRAYER_LABEL } from "@/lib/types";
import { THRESHOLDS } from "@/lib/engine/profile";

export interface ReminderPlan {
  prayer: PrayerName;
  leadTimes: number[]; // minutes before adzan, descending; 0 = at adzan ("waktu masuk")
  primaryLead: number; // the earliest reminder = when PREPARATION begins
  risk: RiskLevel;
  followUp: boolean; // PRD §37/§47 — nudge again if still not checked in
  reason: string; // PRD §66 explainability
}

const MOSQUE_EXTRA = 10; // PRD §44 — leave earlier for a mosque target
export const MAX_REMINDERS_DEFAULT = 3; // PRD §48

// Reminder grids by risk (PRD §37) and by onboarding assistance (PRD §34).
const RISK_GRID: Record<RiskLevel, number[]> = {
  LOW: [5, 0],
  MEDIUM: [10, 0],
  HIGH: [20, 0],
  VERY_HIGH: [30, 10, 0],
};
const ASSIST_GRID: Record<AssistanceLevel, number[]> = {
  low: [5, 0],
  medium: [10, 0],
  high: [20, 5, 0],
};

function tidy(leads: number[], max: number): number[] {
  const clamped = leads.map((m) => Math.min(30, Math.max(0, m))); // PRD §79 clamp
  return [...new Set(clamped)].sort((a, b) => b - a).slice(0, max);
}

export function planReminder(opts: {
  profile: BehaviorProfile;
  assistance: AssistanceLevel;
  mosqueTarget: boolean;
  maxReminders?: number;
}): ReminderPlan {
  const { profile, assistance, mosqueTarget } = opts;
  const max = opts.maxReminders ?? MAX_REMINDERS_DEFAULT;

  // Cold start (PRD §34): too little data → use onboarding assistance default.
  const cold = profile.sample_size < THRESHOLDS.minSample;
  let leads = cold ? [...ASSIST_GRID[assistance]] : [...RISK_GRID[profile.risk_level]];

  // Mosque target leaves earlier (PRD §44): push the first reminder out.
  if (mosqueTarget && leads.length) leads[0] += MOSQUE_EXTRA;

  const leadTimes = tidy(leads, max);
  const primaryLead = leadTimes[0] ?? 0;
  const followUp = !cold && profile.risk_level === "VERY_HIGH";

  return {
    prayer: profile.prayer,
    leadTimes,
    primaryLead,
    risk: profile.risk_level,
    followUp,
    reason: explain(profile, cold, mosqueTarget),
  };
}

// PRD §66 — plain-language reason, never algorithm internals.
function explain(profile: BehaviorProfile, cold: boolean, mosque: boolean): string {
  const name = PRAYER_LABEL[profile.prayer];
  if (cold) return `Pengingat awal untuk ${name}. Akan menyesuaikan setelah aplikasi mengenal polamu.`;
  if (mosque) return `Target ${name} berjamaah di masjid — pengingat sedikit lebih awal untuk bersiap dan berangkat.`;
  switch (profile.risk_level) {
    case "VERY_HIGH":
      return `${name} beberapa kali cukup jauh dari target, jadi aplikasi mengingatkan lebih awal.`;
    case "HIGH":
      return `${name} sering lewat dari target belakangan ini, pengingat dimajukan.`;
    case "MEDIUM":
      return `${name} kadang terlambat, pengingat ringan diberikan.`;
    default:
      return `${name} sudah konsisten. Pengingat dikurangi.`;
  }
}
