import { PRAYER_LABEL, PRAYER_MOOD_LABEL, type JournalEntry, type PrayerLog } from "@/lib/types";

export const tasbihBead = (count: number) => count > 0 ? (count - 1) % 33 : -1;

export function hasJournalContent(entry: JournalEntry) {
  return Boolean(entry.body.trim() || entry.gratitude.trim() || entry.nextStep.trim() || (entry.kind === "dhikr" && entry.count > 0));
}

export function journalTimeline(entries: JournalEntry[], logs: PrayerLog[], month: string, query: string, kind: string, starred: boolean) {
  const needle = query.trim().toLocaleLowerCase("id-ID");
  const stories = entries.filter((entry) => !entry.draft).map((entry) => ({
    id: entry.id, date: entry.date, kind: entry.kind as string, title: entry.title || (entry.kind === "dhikr" ? entry.dhikr : "Sepotong cerita"),
    body: entry.body, mood: entry.mood, time: entry.createdAt, entry, log: undefined as PrayerLog | undefined,
    search: [entry.title, entry.body, entry.gratitude, entry.nextStep, entry.dhikr, entry.mood && PRAYER_MOOD_LABEL[entry.mood], entry.prayer && PRAYER_LABEL[entry.prayer]].join(" "),
  }));
  const prayers = logs.filter((log) => log.performed_at || log.missed || log.note || log.mood).map((log) => ({
    id: `prayer:${log.id}`, date: log.date, kind: "prayer", title: PRAYER_LABEL[log.prayer], body: log.note ?? "", mood: log.mood,
    time: log.performed_at ?? log.prayer_start_at, entry: undefined as JournalEntry | undefined, log,
    search: [PRAYER_LABEL[log.prayer], log.note, log.mood && PRAYER_MOOD_LABEL[log.mood]].join(" "),
  }));
  return [...stories, ...prayers].filter((item) =>
    (!month || item.date.startsWith(month)) && (kind === "all" || item.kind === kind) &&
    (!starred || item.entry?.starred) && item.search.toLocaleLowerCase("id-ID").includes(needle),
  ).sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));
}
