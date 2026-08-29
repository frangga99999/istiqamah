import {
  Coordinates,
  CalculationMethod,
  CalculationParameters,
  PrayerTimes,
  Madhab,
} from "adhan";
import { PRAYERS, type PrayerName, type PrayerSettings, type DaySchedule } from "@/lib/types";

// Calculation methods we expose. "kemenag" (Indonesia, Fajr 20 / Isha 18) is the
// default since the product ships in Indonesian; the rest are adhan built-ins.
export const CALC_METHODS: Record<string, { label: string; make: () => CalculationParameters }> = {
  kemenag: {
    label: "Kemenag (Indonesia)",
    make: () => {
      const p = CalculationMethod.Other();
      p.fajrAngle = 20;
      p.ishaAngle = 18;
      return p;
    },
  },
  mwl: { label: "Muslim World League", make: () => CalculationMethod.MuslimWorldLeague() },
  egyptian: { label: "Egyptian", make: () => CalculationMethod.Egyptian() },
  karachi: { label: "Karachi", make: () => CalculationMethod.Karachi() },
  ummalqura: { label: "Umm al-Qura", make: () => CalculationMethod.UmmAlQura() },
  singapore: { label: "Singapore", make: () => CalculationMethod.Singapore() },
  north_america: { label: "North America (ISNA)", make: () => CalculationMethod.NorthAmerica() },
};

export const DEFAULT_SETTINGS: Omit<PrayerSettings, "latitude" | "longitude" | "timezone"> = {
  calculation_method: "kemenag",
  asr_method: "standard",
  offsets: { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
};

function paramsFor(settings: PrayerSettings): CalculationParameters {
  const method = CALC_METHODS[settings.calculation_method] ?? CALC_METHODS.kemenag;
  const p = method.make();
  p.madhab = settings.asr_method === "hanafi" ? Madhab.Hanafi : Madhab.Shafi;
  const o = settings.offsets;
  // adhan applies these as minute adjustments post-calculation (PRD manual offsets).
  p.adjustments = { fajr: o.fajr, sunrise: 0, dhuhr: o.dhuhr, asr: o.asr, maghrib: o.maghrib, isha: o.isha };
  return p;
}

// The civil Y/M/D in a given IANA timezone, as a Date whose *local* components
// match — adhan reads local getFullYear/Month/Date, so this makes travel correct.
function civilDate(tz: string, base = new Date()): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(base);
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  return new Date(get("year"), get("month") - 1, get("day"));
}

export function localDateKey(tz: string, base = new Date()): string {
  // YYYY-MM-DD in the user's timezone
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(base);
}

function compute(settings: PrayerSettings, day: Date): Record<PrayerName, Date> {
  const coords = new Coordinates(settings.latitude, settings.longitude);
  const t = new PrayerTimes(coords, day, paramsFor(settings));
  return { fajr: t.fajr, dhuhr: t.dhuhr, asr: t.asr, maghrib: t.maghrib, isha: t.isha };
}

// Today's five times (in the user's tz) as a DaySchedule.
export function scheduleForDay(settings: PrayerSettings, base = new Date()): DaySchedule {
  const day = civilDate(settings.timezone, base);
  const times = compute(settings, day);
  const out = {} as Record<PrayerName, string>;
  for (const p of PRAYERS) out[p] = times[p].toISOString();
  return { date: localDateKey(settings.timezone, base), times: out };
}

// Tomorrow's Fajr — the "next prayer" once Isha has passed.
export function tomorrowFajr(settings: PrayerSettings, base = new Date()): Date {
  const today = civilDate(settings.timezone, base);
  const tmr = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  return compute(settings, tmr).fajr;
}

export interface NextPrayer {
  prayer: PrayerName;
  at: Date;
  isTomorrow: boolean;
}

// Which prayer is "next" relative to `now`, rolling to tomorrow's Fajr after Isha.
export function nextPrayer(schedule: DaySchedule, settings: PrayerSettings, now = new Date()): NextPrayer {
  for (const p of PRAYERS) {
    const at = new Date(schedule.times[p]);
    if (at.getTime() > now.getTime()) return { prayer: p, at, isTomorrow: false };
  }
  return { prayer: "fajr", at: tomorrowFajr(settings, now), isTomorrow: true };
}

// The prayer whose *window* currently contains `now` (its time has entered but the
// next prayer hasn't). Returns null before Fajr. Used to know the "current" prayer.
export function currentPrayer(schedule: DaySchedule, now = new Date()): PrayerName | null {
  let current: PrayerName | null = null;
  for (const p of PRAYERS) {
    if (new Date(schedule.times[p]).getTime() <= now.getTime()) current = p;
  }
  return current;
}

export function formatTime(iso: string | Date, tz: string): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}
