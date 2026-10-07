"use client";
// Local-first store: the offline-capable working set (PRD §89). localStorage is
// plenty for ~5 logs/day; Supabase mirrors this when online+authed (see sync.ts).
// ponytail: localStorage over IndexedDB — data volume is tiny, no async needed.
import { useSyncExternalStore } from "react";
import type {
  Goal,
  JournalEntry,
  DailyReflection,
  FastingLog,
  PrayerLog,
  PrayerName,
  PrayerSettings,
  Preferences,
  UserProfile,
} from "@/lib/types";

export interface OnboardingProfile extends UserProfile {
  onboarded: boolean;
}

export interface AppState {
  hydrated: boolean;
  profile: OnboardingProfile | null;
  settings: PrayerSettings | null;
  prefs: Preferences;
  goal: Goal | null;
  logs: PrayerLog[];
  monthlyIntentions: Record<string, string>;
  journalEntries: JournalEntry[];
  dailyReflections: Record<string, DailyReflection>;
  fastingLogs: Record<string, FastingLog>;
}

export const DEFAULT_PREFS: Preferences = {
  assistance: "medium",
  mosque_priority: true,
  sunnah_tracking: true,
  adaptive_reminders: true,
  manual_lead_minutes: null,
  max_reminders: 3,
  sound: true,
  vibration: true,
};

const INITIAL: AppState = {
  hydrated: false,
  profile: null,
  settings: null,
  prefs: DEFAULT_PREFS,
  goal: null,
  logs: [],
  monthlyIntentions: {},
  journalEntries: [],
  dailyReflections: {},
  fastingLogs: {},
};

const K = {
  profile: "ps.profile",
  settings: "ps.settings",
  prefs: "ps.prefs",
  goal: "ps.goal",
  logs: "ps.logs",
  monthlyIntentions: "ps.monthly-intentions",
  journalEntries: "ps.journal-entries",
  dailyReflections: "ps.daily-reflections",
  fastingLogs: "ps.fasting-logs",
} as const;

let state: AppState = INITIAL;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(K.profile, JSON.stringify(state.profile));
    localStorage.setItem(K.settings, JSON.stringify(state.settings));
    localStorage.setItem(K.prefs, JSON.stringify(state.prefs));
    localStorage.setItem(K.goal, JSON.stringify(state.goal));
    localStorage.setItem(K.logs, JSON.stringify(state.logs));
    localStorage.setItem(K.monthlyIntentions, JSON.stringify(state.monthlyIntentions));
    localStorage.setItem(K.journalEntries, JSON.stringify(state.journalEntries));
    localStorage.setItem(K.dailyReflections, JSON.stringify(state.dailyReflections));
    localStorage.setItem(K.fastingLogs, JSON.stringify(state.fastingLogs));
  } catch {
    /* storage full / private mode — app still works in-memory this session */
  }
}

function load<T>(key: string): T | null {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : null;
  } catch {
    return null;
  }
}

function hydrate() {
  if (state.hydrated || typeof window === "undefined") return;
  state = {
    hydrated: true,
    profile: load<OnboardingProfile>(K.profile),
    settings: load<PrayerSettings>(K.settings),
    prefs: { ...DEFAULT_PREFS, ...(load<Partial<Preferences>>(K.prefs) ?? {}) },
    goal: load<Goal>(K.goal),
    logs: load<PrayerLog[]>(K.logs) ?? [],
    monthlyIntentions: load<Record<string, string>>(K.monthlyIntentions) ?? {},
    journalEntries: load<JournalEntry[]>(K.journalEntries) ?? [],
    dailyReflections: load<Record<string, DailyReflection>>(K.dailyReflections) ?? {},
    fastingLogs: load<Record<string, FastingLog>>(K.fastingLogs) ?? {},
  };
  emit();
}

function set(patch: Partial<AppState>) {
  state = { ...state, ...patch };
  persist();
  emit();
}

function subscribe(cb: () => void) {
  hydrate();
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function getState() {
  hydrate();
  return state;
}

// ── React binding ──────────────────────────────────────────────────────────
export function useApp(): AppState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => INITIAL,
  );
}

// ── actions ──────────────────────────────────────────────────────────────────
export function completeOnboarding(
  profile: UserProfile,
  settings: PrayerSettings,
  prefsPatch: Partial<Preferences>,
  goal: Goal,
) {
  set({
    profile: { ...profile, onboarded: true },
    settings,
    prefs: { ...state.prefs, ...prefsPatch },
    goal,
  });
}

export function updateSettings(patch: Partial<PrayerSettings>) {
  if (!state.settings) return;
  set({ settings: { ...state.settings, ...patch } });
}

export function updatePrefs(patch: Partial<Preferences>) {
  set({ prefs: { ...state.prefs, ...patch } });
}

export function setGoal(goal: Goal) {
  set({ goal });
}

export function setMonthlyIntention(month: string, intention: string) {
  set({ monthlyIntentions: { ...state.monthlyIntentions, [month]: intention.trim() } });
}

// ponytail: journals remain on this browser; add account-scoped cloud sync when its schema is deployed.
export function saveJournalEntry(entry: JournalEntry) {
  hydrate();
  const journalEntries = [...state.journalEntries.filter((item) => item.id !== entry.id), entry];
  // Persist before updating the UI so a full disk cannot masquerade as a saved draft.
  localStorage.setItem(K.journalEntries, JSON.stringify(journalEntries));
  state = { ...state, journalEntries };
  emit();
}

export function removeJournalEntry(id: string) {
  const journalEntries = state.journalEntries.filter((entry) => entry.id !== id);
  localStorage.setItem(K.journalEntries, JSON.stringify(journalEntries));
  state = { ...state, journalEntries };
  emit();
}

export function saveDailyReflection(entry: DailyReflection) {
  const dailyReflections = { ...state.dailyReflections, ...load<Record<string, DailyReflection>>(K.dailyReflections), [entry.date]: entry };
  localStorage.setItem(K.dailyReflections, JSON.stringify(dailyReflections));
  state = { ...state, dailyReflections };
  emit();
}

export function dailyReflectionFor(date: string) {
  return load<Record<string, DailyReflection>>(K.dailyReflections)?.[date] ?? state.dailyReflections[date];
}

export function saveFastingLog(entry: FastingLog) {
  const fastingLogs = { ...state.fastingLogs, [entry.date]: entry };
  localStorage.setItem(K.fastingLogs, JSON.stringify(fastingLogs));
  state = { ...state, fastingLogs };
  emit();
}

export function logKey(date: string, prayer: PrayerName) {
  return `${date}:${prayer}`;
}

export function findLog(date: string, prayer: PrayerName): PrayerLog | undefined {
  return state.logs.find((l) => l.date === date && l.prayer === prayer);
}

// Insert or update the log for a (date, prayer). Identity is (date, prayer).
export function upsertLog(input: Omit<PrayerLog, "id"> & { id?: string }): PrayerLog {
  const existing = findLog(input.date, input.prayer);
  const merged: PrayerLog = {
    ...(existing ?? {}),
    ...input,
    id: existing?.id ?? input.id ?? crypto.randomUUID(),
  };
  const logs = existing
    ? state.logs.map((l) => (l.id === merged.id ? merged : l))
    : [...state.logs, merged];
  set({ logs });
  return merged;
}

export function deleteAll() {
  state = { ...INITIAL, hydrated: true };
  persist();
  emit();
}

export function restoreSnapshot(value: unknown) {
  if (!value || typeof value !== "object") throw new Error("Cadangan tidak valid.");
  const snapshot = value as Record<string, unknown>;
  for (const key of Object.keys(K) as (keyof typeof K)[]) {
    if (!(key in snapshot)) throw new Error("Cadangan belum lengkap.");
    const item = snapshot[key];
    if (key === "logs" || key === "journalEntries") {
      if (!Array.isArray(item)) throw new Error("Cadangan tidak valid.");
    } else if (key === "profile" || key === "settings" || key === "goal") {
      if (item !== null && (typeof item !== "object" || Array.isArray(item))) throw new Error("Cadangan tidak valid.");
    } else if (!item || typeof item !== "object" || Array.isArray(item)) throw new Error("Cadangan tidak valid.");
  }
  // Preserve a rollback copy when storage fills mid-restore.
  const previous = Object.values(K).map((key) => [key, localStorage.getItem(key)] as const);
  try {
    for (const key of Object.keys(K) as (keyof typeof K)[]) localStorage.setItem(K[key], JSON.stringify(snapshot[key]));
  } catch (error) {
    for (const [key, item] of previous) { if (item !== null) localStorage.setItem(key, item); else localStorage.removeItem(key); }
    throw error;
  }
  const restored = Object.fromEntries(Object.keys(K).map((key) => [key, snapshot[key]])) as unknown as Omit<AppState, "hydrated">;
  state = { ...restored, hydrated: true };
  emit();
}

// ── sync support ─────────────────────────────────────────────────────────────
// Subscribe to any store change (for pushing to Supabase). Returns an unsubscribe.
export function subscribeStore(cb: () => void) {
  return subscribe(cb);
}

function mergeLogs(local: PrayerLog[], remote: PrayerLog[]): PrayerLog[] {
  const m = new Map(local.map((l) => [logKey(l.date, l.prayer), l]));
  for (const r of remote) {
    const key = logKey(r.date, r.prayer);
    const previous = m.get(key);
    m.set(key, { ...previous, ...r, note: previous?.note, mood: previous?.mood });
  }
  return [...m.values()];
}

// Merge a remote snapshot (from Supabase on login) into local state. Remote wins
// for singletons; logs are unioned by (date, prayer). ponytail: last-write-wins,
// no vector clocks — fine for a single user across devices.
export function applyRemote(r: {
  profile?: OnboardingProfile | null;
  settings?: PrayerSettings | null;
  prefs?: Partial<Preferences> | null;
  goal?: Goal | null;
  logs?: PrayerLog[];
}) {
  set({
    profile: r.profile ?? state.profile,
    settings: r.settings ?? state.settings,
    prefs: r.prefs ? { ...state.prefs, ...r.prefs } : state.prefs,
    goal: r.goal ?? state.goal,
    logs: r.logs ? mergeLogs(state.logs, r.logs) : state.logs,
  });
}
