import type { AssistanceLevel, Goal, GoalType, Preferences, PrayerName, UserProfile } from "@/lib/types";
import { PRAYER_LABEL } from "@/lib/types";

// Single source of goal copy (PRD §55/§56). Used by onboarding, promotion, and
// sync-pull — so a goal stored as (type, prayer, target) rebuilds its label.
export function describeGoal(
  type: GoalType,
  prayer?: PrayerName | null,
  target?: number | null,
): { label: string; subtext: string } {
  const P = prayer ? PRAYER_LABEL[prayer] : "";
  switch (type) {
    case "keep_five":
      return { label: "Jaga lima waktu", subtext: "Fokus tunaikan kelima shalat wajib hari ini." };
    case "reduce_delay":
      return {
        label: `Kurangi keterlambatan${prayer ? ` ${P}` : ""}`,
        subtext: prayer
          ? `${P} maksimal ${target ?? 20} menit setelah masuk waktu.`
          : "Tunaikan shalat lebih dekat dengan awal waktu.",
      };
    case "pray_earlier":
      return { label: "Shalat di awal waktu", subtext: "Usahakan menunaikan shalat dekat awal waktunya." };
    case "mosque":
      return {
        label: `${P || "Shalat"} berjamaah di masjid`,
        subtext:
          prayer === "maghrib"
            ? "Mulai bangun kebiasaan jamaah dari Maghrib."
            : prayer === "isha"
              ? "Tambah Isya ke kebiasaan jamaahmu."
              : "Bangun kebiasaan jamaah di masjid.",
      };
    case "sunnah":
      return {
        label: prayer ? `Tambahkan sunnah ${P}` : "Tambahkan shalat sunnah",
        subtext: prayer === "fajr" ? "Dua rakaat sebelum Subuh." : "Mulai satu sunnah rutin.",
      };
  }
}

export function buildGoal(type: GoalType, prayer?: PrayerName | null, target?: number | null): Goal {
  return { goal_type: type, prayer: prayer ?? null, target_value: target ?? null, ...describeGoal(type, prayer, target) };
}

// PRD §18 & §34 — turn onboarding answers into starting assistance + first focus.
export function startingStrategy(p: UserProfile): {
  assistance: AssistanceLevel;
  prefsPatch: Partial<Preferences>;
  goal: Goal;
} {
  const assistance: AssistanceLevel =
    p.starting_condition === "often_missed"
      ? "high"
      : p.starting_condition === "often_late"
        ? "medium"
        : "low";

  const wantsMosque = p.mosque_frequency === "never" || p.mosque_frequency === "sometimes";

  let goal: Goal;
  switch (p.starting_condition) {
    case "often_missed": // §18 User A
      goal = buildGoal("keep_five");
      break;
    case "often_late": // §18 User B
      goal = buildGoal("reduce_delay", "asr", 20);
      break;
    default: // §18 User C — mostly on time / consistent
      goal = wantsMosque ? buildGoal("mosque", "maghrib") : buildGoal("pray_earlier");
  }

  return {
    assistance,
    prefsPatch: { assistance, mosque_priority: p.mosque_frequency !== "almost_always" },
    goal,
  };
}

// Label shown as the "Target" for a given upcoming prayer on Home (PRD §20).
export function targetLabel(goal: Goal | null, mosqueTarget: boolean): string {
  if (mosqueTarget) return "Berjamaah di masjid";
  switch (goal?.goal_type) {
    case "reduce_delay":
      return "Tepat waktu, jangan ditunda";
    case "pray_earlier":
      return "Usahakan di awal waktu";
    default:
      return "Tunaikan pada waktunya";
  }
}
