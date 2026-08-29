// Runnable self-check for the adaptive engine. Run: npm test
// Plain asserts, no framework (ponytail).
import assert from "node:assert";
import type { PrayerLog, PrayerName } from "@/lib/types";
import { buildProfile, classifyQuality, delayMinutes } from "@/lib/engine/profile";
import { planReminder } from "@/lib/engine/adaptive";

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

console.log(`ok — ${n} engine assertions passed`);
