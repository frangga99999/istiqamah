"use client";
import { useEffect, useRef, useState } from "react";
import { dailyReflectionFor, getState, saveDailyReflection, useApp } from "@/lib/store";
import { canReflect, DAILY_QUESTIONS } from "@/lib/wellbeing";
import { localDateKey } from "@/lib/prayer/times";
import { PRAYER_MOOD_LABEL, type DailyReflection, type PrayerMood } from "@/lib/types";
import { Button, Card, cx } from "@/components/ui";
import { AIAdvice } from "@/components/ai-advice";
import { useNow } from "@/lib/use-now";
import { askWellbeing } from "@/lib/ai";
import { vpsConnected } from "@/lib/vps";

export function DailyReflectionModal() {
  const [entry, setEntry] = useState<DailyReflection | null>(null);
  const [error, setError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const active = useRef<DailyReflection | null>(null);
  const claimed = useRef(false);
  useEffect(() => {
    async function attempt(manual = false) {
      const run = () => {
        const state = getState();
        if (!state.settings || !state.profile?.onboarded || document.visibilityState !== "visible") return;
        const now = new Date();
        const today = localDateKey(state.settings.timezone, now);
        const safe = canReflect(state.settings, state.logs, now);
        if (active.current) {
          if (!safe || active.current.date !== today) { active.current = null; setEntry(null); }
          return;
        }
        if (!safe || document.querySelector('[role="dialog"], dialog[open]') || (!manual && document.activeElement?.matches("input, textarea, select"))) return;
        const existing = dailyReflectionFor(today);
        if (!manual && existing) return;
        const fresh: DailyReflection = existing ?? { date: today, shownAt: now.toISOString(), status: "shown", questions: DAILY_QUESTIONS, questionSource: "standard", feeling: "", goal: "", done: false };
        try { saveDailyReflection(fresh); active.current = fresh; setEntry(fresh); setError(""); }
        catch { /* Retry later rather than show a modal whose once-per-day marker could not be saved. */ }
      };
      if (claimed.current) return;
      claimed.current = true;
      try {
        if (navigator.locks) await navigator.locks.request("istiqamah-daily-reflection", run);
        else run();
      } finally { claimed.current = false; }
    }
    const first = setTimeout(() => void attempt(), 1200);
    const timer = setInterval(() => void attempt(), 10_000);
    const visible = () => void attempt();
    const manual = () => void attempt(true);
    document.addEventListener("visibilitychange", visible);
    window.addEventListener("open-daily-reflection", manual);
    return () => { clearTimeout(first); clearInterval(timer); document.removeEventListener("visibilitychange", visible); window.removeEventListener("open-daily-reflection", manual); };
  }, []);
  useEffect(() => {
    if (entry && !dialog.current?.open) dialog.current?.showModal();
    if (!entry) dialog.current?.close();
  }, [entry]);
  const entryDate = entry?.date;
  useEffect(() => {
    if (!entryDate || !vpsConnected() || active.current?.questionSource === "ai" || active.current?.status === "saved") return;
    let cancelled = false;
    void askWellbeing("questions", {}).then((result) => {
      const current = active.current;
      const state = getState();
      if (cancelled || !current || current.date !== entryDate || current.feeling || current.goal || current.mood || !state.settings || !canReflect(state.settings, state.logs, new Date())) return;
      const next: DailyReflection = { ...current, questions: [result.questions[0], result.questions[1]], questionSource: "ai" };
      saveDailyReflection(next); active.current = next; setEntry(next);
    }).catch(() => { /* Standard questions stay available if the router is unavailable. */ });
    return () => { cancelled = true; };
  }, [entryDate]);

  function update(patch: Partial<DailyReflection>) {
    const current = active.current;
    const state = getState();
    if (!entry || !current || current.date !== entry.date) return;
    if (patch.questionSource && (!state.settings || !canReflect(state.settings, state.logs, new Date()))) return;
    const next = { ...current, ...patch };
    setEntry(next); active.current = next;
    try { saveDailyReflection(next); setError(""); }
    catch { setError("Jawabanmu belum tersimpan. Coba lagi sebelum menutup."); }
  }
  function close(status: DailyReflection["status"]) {
    if (!entry) return;
    try { saveDailyReflection({ ...entry, status }); active.current = null; setEntry(null); setError(""); }
    catch { setError("Jawaban belum tersimpan. Coba lagi."); }
  }
  return <dialog ref={dialog} aria-labelledby="daily-title" onCancel={(event) => { event.preventDefault(); close(entry?.status === "saved" ? "saved" : "skipped"); }} className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-3xl border border-border bg-surface p-5 text-text shadow-xl backdrop:bg-black/45 backdrop:backdrop-blur-sm">
    {entry && <div className="space-y-5">
      <div className="flex items-start justify-between gap-3"><div><p className="text-xs uppercase tracking-widest text-accent">Sejenak untuk hari ini</p><h2 id="daily-title" className="mt-2 font-serif text-2xl">Apa kabar, dirimu?</h2></div><button autoFocus aria-label="Lewati refleksi hari ini" onClick={() => close(entry.status === "saved" ? "saved" : "skipped")} className="h-11 w-11 shrink-0 rounded-full bg-surface-2">×</button></div>
      <p className="text-sm leading-relaxed text-muted">Dua pertanyaan kecil. Tidak harus dijawab sempurna. {entry.questionSource === "ai" ? "Pertanyaan disusun AI." : "Refleksi terpandu."}</p>
      {!entry.feeling && !entry.goal && <AIAdvice mode="questions" context={{}} onResult={(result) => update({ questions: [result.questions[0], result.questions[1]], questionSource: "ai" })} />}
      <fieldset><legend className="mb-3 text-sm font-medium">1. {entry.questions[0]}</legend><div className="mb-3 flex flex-wrap gap-2">{Object.entries(PRAYER_MOOD_LABEL).map(([key, label]) => <button key={key} aria-pressed={entry.mood === key} onClick={() => update({ mood: key as PrayerMood })} className={cx("min-h-11 rounded-full border px-3 text-sm", entry.mood === key ? "border-accent bg-accent-soft text-accent" : "border-border text-muted")}>{label}</button>)}</div><textarea aria-label="Cerita tentang perasaan hari ini" rows={2} maxLength={1000} value={entry.feeling} onChange={(e) => update({ feeling: e.target.value })} placeholder="Ada yang sedang memenuhi pikiranmu?" className="w-full rounded-xl border border-border bg-surface-2 p-3 text-sm" /></fieldset>
      <label className="block text-sm font-medium">2. {entry.questions[1]}<textarea rows={3} maxLength={1000} value={entry.goal} onChange={(e) => update({ goal: e.target.value })} placeholder="Aku ingin lebih tenang. Langkahku: berhenti bekerja saat adzan." className="mt-3 w-full rounded-xl border border-border bg-surface-2 p-3 text-sm font-normal" /></label>
      {error && <p role="alert" className="text-sm text-warn">{error}</p>}
      <Button className="w-full" disabled={(!entry.mood && !entry.feeling.trim()) || !entry.goal.trim()} onClick={() => close("saved")}>Simpan di Perjalanan</Button>
      <p className="text-xs leading-relaxed text-muted">Bisa dilanjutkan dari Perjalanan. Pendamping refleksi ini bukan layanan psikolog atau penilaian kesehatan mental.</p>
    </div>}
  </dialog>;
}

export function DailyReflectionDashboard() {
  const state = useApp();
  const now = useNow();
  const [error, setError] = useState("");
  const [month, setMonth] = useState("");
  if (!state.settings) return null;
  const today = localDateKey(state.settings.timezone, now);
  const all = Object.values(state.dailyReflections).filter((r) => r.status === "saved").sort((a, b) => b.date.localeCompare(a.date));
  const entries = all.filter((r) => !month || r.date.startsWith(month));
  const safe = canReflect(state.settings, state.logs, now);
  const months = [...new Set(all.map((entry) => entry.date.slice(0, 7)))];
  const current = state.dailyReflections[today];
  const done = entries.filter((entry) => entry.done).length;
  const dateLabel = (date: string) => new Intl.DateTimeFormat("id-ID", { weekday: "short", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
  return <Card className="p-5">
    <p className="text-xs uppercase tracking-widest text-accent">Ruang refleksi</p><h2 className="mt-2 font-serif text-2xl">Perasaan & arah harimu</h2>
    <p className="mt-2 text-sm text-muted">{entries.length ? `${entries.length} hari bercerita · ${done} langkah kecil kamu tandai selesai.` : "Perasaanmu layak didengar. Mulai dari satu langkah kecil hari ini."}</p>
    <Button className="mt-4 w-full" variant="secondary" disabled={!safe} onClick={() => window.dispatchEvent(new Event("open-daily-reflection"))}>{current?.status === "saved" ? "Lihat / ubah hari ini" : "Isi refleksi hari ini"}</Button>
    {!safe && <p className="mt-2 text-xs text-muted">Jeda untuk shalat. Refleksi tersedia 60 menit setelah masuk waktu atau check-in terakhir, hingga 30 menit sebelum shalat berikutnya.</p>}
    {error && <p role="alert" className="mt-2 text-sm text-warn">{error}</p>}
    {all.length > 0 && <label className="mt-4 block text-xs text-muted">Bulan refleksi<select value={month} onChange={(e) => setMonth(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-surface-2 p-3 text-sm"><option value="">Semua bulan</option>{months.map((m) => <option key={m} value={m}>{new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${m}-01T12:00:00Z`))}</option>)}</select></label>}
    <div className="mt-4 space-y-3">{entries.map((entry) => <details key={entry.date} className="rounded-xl border border-border p-3" open={entry.date === today || undefined}>
      <summary className="cursor-pointer text-sm font-medium">{dateLabel(entry.date)} · {entry.mood ? PRAYER_MOOD_LABEL[entry.mood] : "Cerita hari ini"}{entry.done ? " · Langkah selesai" : ""}</summary>
      <p className="mt-3 whitespace-pre-wrap break-words text-sm text-muted">{entry.feeling}</p><p className="mt-3 text-xs text-accent">Yang ingin kujaga</p><p className="mt-1 whitespace-pre-wrap break-words text-sm">{entry.goal}</p>
      <label className="mt-3 flex min-h-11 items-center gap-2 text-sm text-muted"><input type="checkbox" checked={entry.done} onChange={(e) => { try { saveDailyReflection({ ...entry, done: e.target.checked }); setError(""); } catch { setError("Perubahan belum tersimpan."); } }} />Langkah kecil ini sudah kulakukan</label>
      {entry.aiReflection && <p className="my-3 rounded-xl bg-accent-soft p-3 text-sm leading-relaxed">Refleksi AI: {entry.aiReflection}</p>}
      <AIAdvice key={`${entry.date}:${entry.feeling}:${entry.goal}`} mode="reflection" context={{ mood: entry.mood ?? "", feeling: entry.feeling, goal: entry.goal }} onResult={(result) => {
        const latest = getState().dailyReflections[entry.date];
        if (latest && latest.feeling === entry.feeling && latest.goal === entry.goal) saveDailyReflection({ ...latest, aiReflection: result.reflection });
      }} />
    </details>)}</div>
    <p className="mt-3 text-xs text-muted">Jawaban tersimpan di perangkat ini dan ikut dalam ekspor data.</p>
  </Card>;
}
