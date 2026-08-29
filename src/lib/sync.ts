"use client";
// Cloud sync (PRD §90). Local-first store is the working set; Supabase mirrors it
// when signed in. On login: pull remote, merge, push merged back. On change: push
// (debounced). ponytail: last-write-wins, no conflict UI — single user across devices.
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase/client";
import { applyRemote, getState, type OnboardingProfile } from "@/lib/store";
import { buildGoal } from "@/lib/focus";
import type { Goal, PrayerLog, PrayerSettings, Preferences } from "@/lib/types";

const LOG_COLS =
  "id,date,prayer,prayer_start_at,reminder_first_at,preparation_started_at,performed_at,performed_location,congregational,sunnah_before,sunnah_after,manual_time";

async function uid(sb: SupabaseClient): Promise<string | null> {
  const { data } = await sb.auth.getUser();
  return data.user?.id ?? null;
}

// ── mappers ──────────────────────────────────────────────────────────────────
function settingsToRow(user_id: string, s: PrayerSettings, p: Preferences) {
  return {
    user_id,
    latitude: s.latitude,
    longitude: s.longitude,
    timezone: s.timezone,
    location_label: s.location_label ?? null,
    calculation_method: s.calculation_method,
    asr_method: s.asr_method,
    fajr_offset: s.offsets.fajr,
    dhuhr_offset: s.offsets.dhuhr,
    asr_offset: s.offsets.asr,
    maghrib_offset: s.offsets.maghrib,
    isha_offset: s.offsets.isha,
    mosque_priority: p.mosque_priority,
    sunnah_tracking: p.sunnah_tracking,
    adaptive_reminders: p.adaptive_reminders,
    manual_lead_minutes: p.manual_lead_minutes,
    max_reminders: p.max_reminders,
    sound: p.sound,
    vibration: p.vibration,
  };
}

function rowToSettings(r: Record<string, unknown>): { settings: PrayerSettings; prefs: Partial<Preferences> } {
  return {
    settings: {
      latitude: Number(r.latitude),
      longitude: Number(r.longitude),
      timezone: String(r.timezone),
      location_label: (r.location_label as string) ?? undefined,
      calculation_method: String(r.calculation_method),
      asr_method: (r.asr_method as "standard" | "hanafi") ?? "standard",
      offsets: {
        fajr: Number(r.fajr_offset ?? 0),
        dhuhr: Number(r.dhuhr_offset ?? 0),
        asr: Number(r.asr_offset ?? 0),
        maghrib: Number(r.maghrib_offset ?? 0),
        isha: Number(r.isha_offset ?? 0),
      },
    },
    prefs: {
      mosque_priority: Boolean(r.mosque_priority),
      sunnah_tracking: Boolean(r.sunnah_tracking),
      adaptive_reminders: Boolean(r.adaptive_reminders),
      manual_lead_minutes: (r.manual_lead_minutes as number) ?? null,
      max_reminders: Number(r.max_reminders ?? 3),
      sound: Boolean(r.sound),
      vibration: Boolean(r.vibration),
    },
  };
}

function logToRow(user_id: string, l: PrayerLog) {
  return {
    user_id,
    id: l.id,
    date: l.date,
    prayer: l.prayer,
    prayer_start_at: l.prayer_start_at,
    reminder_first_at: l.reminder_first_at ?? null,
    preparation_started_at: l.preparation_started_at ?? null,
    performed_at: l.performed_at ?? null,
    performed_location: l.performed_location ?? null,
    congregational: l.congregational ?? null,
    sunnah_before: l.sunnah_before ?? false,
    sunnah_after: l.sunnah_after ?? false,
    manual_time: l.manual_time ?? false,
  };
}

const rowToLog = (r: Record<string, unknown>): PrayerLog => r as unknown as PrayerLog;

function profileToRow(user_id: string, p: OnboardingProfile) {
  return {
    user_id,
    activity_type: p.activity_type,
    starting_condition: p.starting_condition,
    mosque_frequency: p.mosque_frequency,
    sunnah_frequency: p.sunnah_frequency,
    onboarded: p.onboarded,
  };
}

const rowToProfile = (r: Record<string, unknown>): OnboardingProfile => ({
  activity_type: r.activity_type as OnboardingProfile["activity_type"],
  starting_condition: r.starting_condition as OnboardingProfile["starting_condition"],
  mosque_frequency: r.mosque_frequency as OnboardingProfile["mosque_frequency"],
  sunnah_frequency: r.sunnah_frequency as OnboardingProfile["sunnah_frequency"],
  onboarded: Boolean(r.onboarded),
});

const rowToGoal = (r: Record<string, unknown>): Goal =>
  buildGoal(r.goal_type as Goal["goal_type"], (r.prayer as Goal["prayer"]) ?? null, (r.target_value as number) ?? null);

// ── push / pull ──────────────────────────────────────────────────────────────
let lastGoalSig = "";

async function push(sb: SupabaseClient, user_id: string) {
  const s = getState();
  if (s.profile) await sb.from("user_profiles").upsert(profileToRow(user_id, s.profile));
  if (s.settings) await sb.from("user_prayer_settings").upsert(settingsToRow(user_id, s.settings, s.prefs));
  if (s.logs.length)
    await sb.from("prayer_logs").upsert(s.logs.map((l) => logToRow(user_id, l)), { onConflict: "user_id,date,prayer" });

  // Goal changes rarely — only write when it actually changed (avoids row churn).
  const sig = JSON.stringify(s.goal && { t: s.goal.goal_type, p: s.goal.prayer, v: s.goal.target_value });
  if (s.goal && sig !== lastGoalSig) {
    await sb.from("goals").update({ status: "dismissed" }).eq("user_id", user_id).eq("status", "active");
    await sb.from("goals").insert({
      user_id,
      goal_type: s.goal.goal_type,
      prayer: s.goal.prayer ?? null,
      target_value: s.goal.target_value ?? null,
      status: "active",
    });
    lastGoalSig = sig;
  }
}

export async function fullSync() {
  const sb = getSupabase();
  if (!sb) return;
  const id = await uid(sb);
  if (!id) return;

  const [prof, setg, logsRes, goalRes] = await Promise.all([
    sb.from("user_profiles").select("*").eq("user_id", id).maybeSingle(),
    sb.from("user_prayer_settings").select("*").eq("user_id", id).maybeSingle(),
    sb.from("prayer_logs").select(LOG_COLS).eq("user_id", id),
    sb.from("goals").select("*").eq("user_id", id).eq("status", "active").order("created_at", { ascending: false }).limit(1),
  ]);

  const setMapped = setg.data ? rowToSettings(setg.data) : null;
  applyRemote({
    profile: prof.data ? rowToProfile(prof.data) : undefined,
    settings: setMapped?.settings,
    prefs: setMapped?.prefs,
    goal: goalRes.data?.[0] ? rowToGoal(goalRes.data[0]) : undefined,
    logs: (logsRes.data ?? []).map(rowToLog),
  });

  await push(sb, id);
}

// Debounced push of the current local state (call on every store change).
let timer: ReturnType<typeof setTimeout> | undefined;
export function pushDebounced() {
  const sb = getSupabase();
  if (!sb) return;
  clearTimeout(timer);
  timer = setTimeout(async () => {
    const id = await uid(sb);
    if (id) await push(sb, id);
  }, 1500);
}
