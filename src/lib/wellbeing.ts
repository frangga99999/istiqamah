import { nextPrayer, previousPrayerAt, scheduleForDay } from "@/lib/prayer/times";
import type { PrayerLog, PrayerSettings } from "@/lib/types";

export const DAILY_QUESTIONS: [string, string] = [
  "Kalau berhenti sejenak, perasaan apa yang paling terasa hari ini? Apa yang sedang kamu butuhkan?",
  "Apa satu hal yang ingin kamu jaga hari ini, dan langkah kecil apa yang bisa kamu lakukan?",
];

export function reflectionWindow(now: Date, previous: Date, next: Date, performed?: Date) {
  const last = Math.max(previous.getTime(), performed?.getTime() ?? 0);
  return now.getTime() - last >= 60 * 60_000 && next.getTime() - now.getTime() > 30 * 60_000;
}

export function canReflect(settings: PrayerSettings, logs: PrayerLog[], now: Date) {
  const schedule = scheduleForDay(settings, now);
  const previous = previousPrayerAt(settings, now);
  const performed = logs.filter((log) => log.performed_at && new Date(log.performed_at) <= now && new Date(log.performed_at) >= previous)
    .map((log) => new Date(log.performed_at!).getTime());
  return reflectionWindow(now, previous, nextPrayer(schedule, settings, now).at, performed.length ? new Date(Math.max(...performed)) : undefined);
}

export function isMondayThursday(date: string) {
  return [1, 4].includes(new Date(`${date}T12:00:00Z`).getUTCDay());
}

export function fastingDates(today: string) {
  return Array.from({ length: 21 }, (_, i) => {
    const date = new Date(`${today}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + i - 7);
    return date.toISOString().slice(0, 10);
  }).filter(isMondayThursday);
}
