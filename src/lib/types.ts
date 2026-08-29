// Domain types — mirror the PRD data model (§70–78) and state machine (§21, §30, §36).

export const PRAYERS = ["fajr", "dhuhr", "asr", "maghrib", "isha"] as const;
export type PrayerName = (typeof PRAYERS)[number];

export const PRAYER_LABEL: Record<PrayerName, string> = {
  fajr: "Subuh",
  dhuhr: "Dzuhur",
  asr: "Ashar",
  maghrib: "Maghrib",
  isha: "Isya",
};

// PRD §21 — a prayer's live state on the Home screen.
export type PrayerState =
  | "UPCOMING"
  | "PREPARATION"
  | "PRAYER_TIME"
  | "LATE_RISK"
  | "COMPLETED"
  | "MISSED";

// PRD §30 — internal analytics classification of a performed prayer.
export type PrayerQuality = "EARLY" | "ON_TIME" | "LATE_RISK" | "MISSED";

// PRD §36 — per-prayer risk used to pick reminder lead time.
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH";

// PRD §27 — where/how the prayer was performed.
export type PerformedLocation = "mosque" | "congregation" | "alone";

// PRD §34 — starting assistance derived from onboarding.
export type AssistanceLevel = "low" | "medium" | "high";

// Onboarding answers (PRD §13–16).
export type StartingCondition = "often_missed" | "often_late" | "mostly_ontime" | "consistent";
export type MosqueFrequency = "never" | "sometimes" | "often" | "almost_always";
export type SunnahFrequency = "never" | "sometimes" | "routine";
export type ActivityType = "work" | "college" | "school" | "flexible" | "other";

export interface UserProfile {
  activity_type: ActivityType;
  starting_condition: StartingCondition;
  mosque_frequency: MosqueFrequency;
  sunnah_frequency: SunnahFrequency;
}

// Reminder / goal preferences (PRD §67–68). Kept beside prayer settings.
export interface Preferences {
  assistance: AssistanceLevel; // derived from onboarding, user-overridable
  mosque_priority: boolean;
  sunnah_tracking: boolean;
  adaptive_reminders: boolean; // §68 — off means use manual_lead_minutes
  manual_lead_minutes: number | null;
  max_reminders: number; // §48
  sound: boolean;
  vibration: boolean;
}

export interface PrayerSettings {
  latitude: number;
  longitude: number;
  timezone: string;
  // adhan Madhab + CalculationMethod keys, kept as strings at the boundary.
  calculation_method: string;
  asr_method: "standard" | "hanafi";
  // per-prayer manual offsets in minutes
  offsets: Record<PrayerName, number>;
  location_label?: string;
}

// One day's computed schedule (PRD §73). Times are ISO strings (UTC), rendered in tz.
export interface DaySchedule {
  date: string; // YYYY-MM-DD (local)
  times: Record<PrayerName, string>; // ISO datetime
}

// PRD §74 — a logged prayer.
export interface PrayerLog {
  id: string;
  date: string; // YYYY-MM-DD
  prayer: PrayerName;
  prayer_start_at: string; // ISO
  reminder_first_at?: string | null;
  preparation_started_at?: string | null;
  performed_at?: string | null; // ISO — null = not yet recorded
  performed_location?: PerformedLocation | null;
  congregational?: boolean | null;
  sunnah_before?: boolean;
  sunnah_after?: boolean;
  manual_time?: boolean; // user corrected the time (PRD §29)
}

// PRD §76 — rolling behaviour profile per prayer, the engine's memory.
export interface BehaviorProfile {
  prayer: PrayerName;
  average_delay: number; // minutes
  average_preparation_time: number; // minutes
  optimal_lead_time: number; // minutes
  risk_level: RiskLevel;
  consistency_score: number; // 0..1
  sample_size: number;
}

// A goal / weekly focus (PRD §54–58, §77).
export type GoalType =
  | "keep_five"
  | "reduce_delay"
  | "pray_earlier"
  | "mosque"
  | "sunnah";

export interface Goal {
  goal_type: GoalType;
  prayer?: PrayerName | null;
  target_value?: number | null; // e.g. max delay minutes
  label: string; // human copy shown on Journey
  subtext?: string;
}
