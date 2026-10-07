// Runnable self-check for the adaptive engine. Run: npm test
// Plain asserts, no framework (ponytail).
import assert from "node:assert";
import type { PrayerLog, PrayerName } from "@/lib/types";
import { buildProfile, classifyQuality, delayMinutes } from "@/lib/engine/profile";
import { planReminder } from "@/lib/engine/adaptive";
import { prayerState } from "@/lib/prayer/state";
import { dhuhaWindow, DEFAULT_SETTINGS, localDateKey } from "@/lib/prayer/times";
import { hasJournalContent, journalTimeline } from "@/lib/journal";
import type { JournalEntry } from "@/lib/types";
import { getState, saveJournalEntry, removeJournalEntry, restoreSnapshot } from "@/lib/store";
import { reflectionWindow, fastingDates, isMondayThursday } from "@/lib/wellbeing";
import { validRequest, validResult } from "@/lib/wellbeing-contract";

let n = 0;
const ok = (cond: boolean, msg: string) => {
  n++;
  assert.ok(cond, msg);
};

// Build a log for `prayer` on day `d` with a given delay (min) and optional prep lead.
function log(prayer: PrayerName, d: number, delay: number | null, prepBefore?: number): PrayerLog {
  const start = new Date(2026, 0, d, 15, 20, 0); // arbitrary fixed adzan
  const performed = delay === null ? null : new Date(start.getTime() + delay * 60_000);
  return {
    id: `${prayer}-${d}`,
    date: `2026-01-${String(d).padStart(2, "0")}`,
    prayer,
    prayer_start_at: start.toISOString(),
    performed_at: performed?.toISOString() ?? null,
    preparation_started_at:
      performed && prepBefore != null
        ? new Date(performed.getTime() - prepBefore * 60_000).toISOString()
        : null,
  };
}

// classifyQuality thresholds
ok(classifyQuality(log("asr", 1, 2)) === "EARLY", "2m delay = EARLY");
ok(classifyQuality(log("asr", 1, 15)) === "ON_TIME", "15m delay = ON_TIME");
ok(classifyQuality(log("asr", 1, 40)) === "LATE_RISK", "40m delay = LATE_RISK");
ok(classifyQuality(log("asr", 1, null)) === "MISSED", "no performed_at = MISSED");
ok(delayMinutes(log("asr", 1, 16)) === 16, "delayMinutes computes 16");

// Live urgency states: enter preparation at the configured lead time, then miss
// only after the prayer window closes.
const adzan = new Date("2026-01-01T15:00:00Z");
const nextAdzan = new Date("2026-01-01T18:00:00Z");
const liveState = (now: string) =>
  prayerState({
    start: adzan,
    windowEnd: nextAdzan,
    now: new Date(now),
    performedAt: null,
    leadTimeMin: 20,
    lateRiskAfterMin: 20,
  });
ok(liveState("2026-01-01T14:45:00Z") === "PREPARATION", "inside lead time = PREPARATION");
ok(liveState("2026-01-01T18:00:00Z") === "MISSED", "closed prayer window = MISSED");

// Consistently very-late Ashar → VERY_HIGH risk, big avg delay.
const lateAsr = Array.from({ length: 8 }, (_, i) => log("asr", i + 1, 40 + (i % 3) * 5));
const pLate = buildProfile("asr", lateAsr);
ok(pLate.average_delay >= 35, `late avg delay large, got ${pLate.average_delay}`);
ok(pLate.risk_level === "VERY_HIGH", `late Ashar VERY_HIGH, got ${pLate.risk_level}`);

const planLate = planReminder({ profile: pLate, assistance: "medium", mosqueTarget: false });
assert.deepStrictEqual(planLate.leadTimes, [30, 10, 0], "VERY_HIGH grid = [30,10,0]");
ok(planLate.followUp === true, "VERY_HIGH schedules follow-up");
n += 1;

// Consistently early Maghrib → LOW risk → light reminder.
const earlyMag = Array.from({ length: 8 }, (_, i) => log("maghrib", i + 1, 3));
const pEarly = buildProfile("maghrib", earlyMag);
ok(pEarly.risk_level === "LOW", `early Maghrib LOW, got ${pEarly.risk_level}`);
assert.deepStrictEqual(
  planReminder({ profile: pEarly, assistance: "medium", mosqueTarget: false }).leadTimes,
  [5, 0],
  "LOW grid = [5,0]",
);
n += 1;

// Cold start (few samples) uses onboarding assistance default, not computed risk.
const cold = buildProfile("isha", [log("isha", 1, 30), log("isha", 2, 25)]);
const planCold = planReminder({ profile: cold, assistance: "high", mosqueTarget: false });
assert.deepStrictEqual(planCold.leadTimes, [20, 5, 0], "cold high-assistance = [20,5,0]");
ok(planCold.followUp === false, "cold start never follows up");
n += 2;

// Mosque target pushes the first reminder earlier and clamps at 30.
const planMosque = planReminder({ profile: pLate, assistance: "medium", mosqueTarget: true });
ok(planMosque.leadTimes[0] === 30, "mosque bump clamped to 30");
const planMosqueMed = planReminder({ profile: pEarly, assistance: "medium", mosqueTarget: true });
ok(planMosqueMed.leadTimes[0] === 15, `mosque bump 5+10=15, got ${planMosqueMed.leadTimes[0]}`);

const settings = { ...DEFAULT_SETTINGS, latitude: -6.2, longitude: 106.8, timezone: "Asia/Jakarta" };
const morning = new Date("2026-10-07T01:00:00Z");
const dhuha = dhuhaWindow(settings, morning)!;
ok(dhuha.start > dhuha.sunrise && dhuha.end > dhuha.start, "Dhuha follows sunrise and has a valid window");
ok(localDateKey(settings.timezone, dhuha.start) === "2026-10-07", "Dhuha uses the selected civil date");
ok(dhuhaWindow({ ...settings, offsets: { ...settings.offsets, dhuhr: 60 } }, morning)!.end.getTime() === dhuha.end.getTime(), "manual Dhuhr offset cannot extend Dhuha");
ok(dhuhaWindow({ ...settings, latitude: 89 }, new Date("2026-06-21T12:00:00Z")) === null, "unavailable sunrise produces no Dhuha estimate");
const entry: JournalEntry = { id: "story", date: "2026-10-07", kind: "story", title: "", body: "Hati lebih tenang", gratitude: "", nextStep: "", dhikr: "Subhanallah", count: 0, draft: false, starred: true, createdAt: morning.toISOString(), updatedAt: morning.toISOString() };
ok(hasJournalContent(entry), "a story can be saved without title or mood");
ok(!hasJournalContent({ ...entry, body: "   " }), "empty story is not published");
ok(hasJournalContent({ ...entry, kind: "dhikr", body: "", count: 3 }), "dhikr can be saved without a story");
const mixed = [entry, { ...entry, id: "draft", draft: true }, { ...entry, id: "old", date: "2026-09-30" }];
ok(journalTimeline(mixed, [], "2026-10", "TENANG", "all", false).length === 1, "search excludes drafts and other months");
ok(journalTimeline(mixed, [log("asr", 1, 4)], "", "", "prayer", false).length === 1, "prayer logs appear without a note");
ok(journalTimeline([entry, { ...entry, id: "other", starred: false }], [], "", "", "all", true).length === 1, "saved filter returns only bookmarked stories");
const memory = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { setItem: (key: string, value: string) => memory.set(key, value) } });
saveJournalEntry(entry);
saveJournalEntry({ ...entry, body: "Tulisan yang diperbarui" });
ok(getState().journalEntries.length === 1 && JSON.parse(memory.get("ps.journal-entries")!)[0].body === "Tulisan yang diperbarui", "editing persists the same entry without duplicates");
Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { setItem: () => { throw new Error("quota"); } } });
assert.throws(() => saveJournalEntry({ ...entry, body: "Unsaved" }));
ok(getState().journalEntries[0].body === "Tulisan yang diperbarui", "failed storage cannot report unsaved text as saved");
Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { setItem: (key: string, value: string) => memory.set(key, value) } });
removeJournalEntry(entry.id);
ok(getState().journalEntries.length === 0, "removing a journal entry persists deletion");
const previous = new Date("2026-10-08T05:00:00Z");
const following = new Date("2026-10-08T08:00:00Z");
const allowedAt = (time: string, performed?: Date) => reflectionWindow(new Date(`2026-10-08T${time}Z`), previous, following, performed);
ok(!allowedAt("05:59:59"), "reflection waits a full hour after prayer");
ok(allowedAt("06:00:00"), "reflection opens at one hour if next prayer is distant");
ok(!allowedAt("07:30:00"), "reflection is blocked exactly thirty minutes before prayer");
ok(!allowedAt("08:00:00"), "reflection is blocked at prayer time");
ok(!allowedAt("06:00:00", new Date("2026-10-08T05:15:00Z")), "later check-in extends the reflection delay");
ok(reflectionWindow(new Date("2026-10-08T01:00:00Z"), new Date("2026-10-07T23:00:00Z"), new Date("2026-10-08T02:00:00Z")), "reflection handles midnight across dates");
ok(isMondayThursday("2026-10-08") && !isMondayThursday("2026-10-09"), "fasting dates use civil weekdays");
ok(fastingDates("2026-12-31").every(isMondayThursday), "fasting dates remain correct across year boundary");
ok(validRequest({ mode: "questions", context: {} }), "minimal AI request is valid");
ok(!validRequest({ mode: "fasting", context: { sleep: "25" } }), "invalid sleep duration is rejected");
ok(!validRequest({ mode: "reflection", context: { secret: "unexpected" } }), "unrecognized context is rejected");
ok(!validRequest({ mode: "questions", context: {}, override: "unexpected" }), "extra request properties are rejected");
ok(!validRequest({ mode: "questions", context: [] }), "array context is rejected");
ok(!validResult({ questions: ["Only one"] }), "incomplete AI answer is rejected");
const fastingAnswer = { questions: [], reflection: "", nutrition: "Sahur seimbang", sleep: "Rencanakan istirahat", health: "Dengarkan tubuh", spiritual: "Satu momen syukur" };
ok(validResult(fastingAnswer, "fasting") && !validResult(fastingAnswer, "questions"), "unused questions can be empty for fasting but the daily modal requires two");
Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: (key: string) => memory.get(key) ?? null, removeItem: (key: string) => memory.delete(key), setItem: (key: string, value: string) => memory.set(key, value) } });
const { hydrated: _hydrated, ...snapshot } = getState();
void _hydrated;
assert.throws(() => restoreSnapshot({ ...snapshot, logs: {} }));
ok(Array.isArray(getState().logs), "malformed restore leaves current prayer logs intact");
restoreSnapshot({ ...snapshot, monthlyIntentions: { "2026-10": "Harapan uji" }, unexpected: "ignored" });
ok(getState().monthlyIntentions["2026-10"] === "Harapan uji" && JSON.parse(memory.get("ps.monthly-intentions")!)["2026-10"] === "Harapan uji", "restored hopes persist before updating the interface");
ok(!("unexpected" in getState()), "restores whitelist only known state fields");
console.log(`ok — ${n} assertions passed`);
