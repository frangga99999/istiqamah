"use client";
import { useState } from "react";
import { getState, saveFastingLog, useApp } from "@/lib/store";
import { fastingDates } from "@/lib/wellbeing";
import { localDateKey, formatTime, scheduleForDay } from "@/lib/prayer/times";
import type { FastingLog } from "@/lib/types";
import { Card, cx } from "@/components/ui";
import { AIAdvice } from "@/components/ai-advice";
import { useNow } from "@/lib/use-now";

const statusLabels: Record<FastingLog["status"], string> = { planned: "Direncanakan", fasting: "Sedang puasa", completed: "Selesai", skipped: "Tidak berpuasa" };

export function FastingTracker() {
  const state = useApp();
  const now = useNow();
  const [selected, setSelected] = useState("");
  const [error, setError] = useState("");
  const [sleep, setSleep] = useState("7");
  const [activity, setActivity] = useState("ringan");
  const [health, setHealth] = useState("Tidak ada kondisi khusus yang diketahui");
  const [food, setFood] = useState("");
  if (!state.settings) return null;
  const today = localDateKey(state.settings.timezone, now);
  const dates = fastingDates(today);
  const date = dates.includes(selected) ? selected : dates.find((day) => day >= today)!;
  const log = state.fastingLogs[date];
  const todaySchedule = scheduleForDay(state.settings, now);
  const beforeFajr = now < new Date(todaySchedule.times.fajr);
  const afterMaghrib = now >= new Date(todaySchedule.times.maghrib);
  const history = Object.values(state.fastingLogs).sort((a, b) => b.date.localeCompare(a.date));
  const completed = history.filter((entry) => entry.date.startsWith(today.slice(0, 7)) && entry.status === "completed").length;
  const label = (day: string) => new Intl.DateTimeFormat("id-ID", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${day}T12:00:00Z`));
  function save(patch: Partial<FastingLog>) {
    const latest = getState().fastingLogs[date];
    try { saveFastingLog({ date, status: latest?.status ?? "planned", note: latest?.note ?? "", ...patch }); setError(""); }
    catch { setError("Catatan puasa belum tersimpan. Coba lagi."); }
  }
  return <Card className="p-5">
    <div className="flex items-start justify-between gap-3"><div><p className="text-xs uppercase tracking-widest text-accent">Senin & Kamis</p><h2 className="mt-2 font-serif text-2xl">Puasa, sesuai kemampuanmu.</h2></div><span className="shrink-0 rounded-full bg-accent-soft px-3 py-2 text-xs text-accent">{completed} bulan ini</span></div>
    <p className="mt-2 text-sm text-muted">Rencanakan, catat, lalu dengarkan tubuhmu.</p>
    <div className="mt-4 flex gap-2 overflow-x-auto pb-2" aria-label="Tanggal puasa">{dates.map((day) => <button key={day} aria-pressed={day === date} onClick={() => setSelected(day)} className={cx("min-h-14 shrink-0 rounded-xl border px-3 py-2 text-xs", day === date ? "border-accent bg-accent-soft text-accent" : "border-border text-muted")}><span className="block">{label(day)}</span><span className="mt-1 block">{state.fastingLogs[day] ? statusLabels[state.fastingLogs[day].status] : day === today ? "Hari ini" : "Belum dicatat"}</span></button>)}</div>
    <p className="mt-3 text-sm font-medium">{label(date)}{log ? ` · ${statusLabels[log.status]}` : ""}</p>
    {date === today && <div className="mt-3 flex justify-between rounded-xl bg-surface-2 p-3 text-sm"><span>Subuh <b className="tabular">{formatTime(todaySchedule.times.fajr, state.settings.timezone)}</b></span><span>Maghrib <b className="tabular">{formatTime(todaySchedule.times.maghrib, state.settings.timezone)}</b></span></div>}
    <div className="mt-3 grid grid-cols-2 gap-2">{(Object.entries(statusLabels) as [FastingLog["status"], string][]).map(([status, text]) => {
      const disabled = status === "fasting" ? date !== today || beforeFajr || afterMaghrib : status === "completed" ? date > today || (date === today && !afterMaghrib) : status === "planned" && date < today;
      return <button key={status} disabled={disabled} aria-pressed={log?.status === status} onClick={() => save({ status })} className={cx("min-h-11 rounded-xl border p-2 text-sm disabled:opacity-35", log?.status === status ? "border-accent bg-accent-soft text-accent" : "border-border text-muted")}>{text}</button>;
    })}</div>
    {date === today && !afterMaghrib && <p className="mt-2 text-xs text-muted">Tanda selesai tersedia setelah Maghrib.</p>}
    <label className="mt-4 block text-sm text-muted">Catatan singkat<textarea key={date} defaultValue={log?.note ?? ""} rows={2} maxLength={500} onBlur={(e) => save({ note: e.target.value })} placeholder="Bagaimana rasanya hari ini?" className="mt-2 w-full rounded-xl border border-border bg-surface-2 p-3 text-sm" /></label>
    {error && <p role="alert" className="mt-2 text-sm text-warn">{error}</p>}
    <details className="mt-4 border-t border-border pt-3"><summary className="cursor-pointer py-2 text-sm font-medium">Nutrisi, istirahat & pendamping AI</summary>
      <p className="mt-2 text-xs leading-relaxed text-muted">Panduan umum untuk dewasa. Jika sedang sakit, memiliki kondisi medis, hamil/menyusui, atau memakai obat rutin, konsultasikan rencana puasa dengan tenaga kesehatan.</p>
      <div className="mt-3 grid grid-cols-2 gap-3"><label className="text-xs text-muted">Tidur semalam (jam)<input type="number" min="0" max="24" step="0.5" value={sleep} onChange={(e) => setSleep(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-surface-2 p-3 text-sm" /></label><label className="text-xs text-muted">Aktivitas hari ini<select value={activity} onChange={(e) => setActivity(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-surface-2 p-3 text-sm"><option>ringan</option><option>sedang</option><option>berat</option></select></label></div>
      <label className="mt-3 block text-xs text-muted">Kondisi umum<select value={health} onChange={(e) => setHealth(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-surface-2 p-3 text-sm"><option>Tidak ada kondisi khusus yang diketahui</option><option>Ada kondisi medis / obat rutin / hamil atau menyusui</option><option>Sedang tidak sehat</option></select></label>
      <label className="mt-3 block text-xs text-muted">Preferensi makanan / alergi (opsional)<input value={food} maxLength={300} onChange={(e) => setFood(e.target.value)} placeholder="Misalnya: vegetarian, alergi kacang" className="mt-1 w-full rounded-xl border border-border bg-surface-2 p-3 text-sm" /></label>
      {health !== "Tidak ada kondisi khusus yang diketahui" && <p className="my-3 rounded-xl bg-warn-soft p-3 text-sm text-warn">Utamakan kesehatan. AI tidak dapat menentukan apakah kamu aman berpuasa. Bila merasa sakit, hentikan puasa dan cari bantuan medis; gejala berat memerlukan bantuan segera.</p>}
      <div className="mt-3">{sleep.trim() && Number.isFinite(Number(sleep)) && Number(sleep) >= 0 && Number(sleep) <= 24 ? <AIAdvice key={`${date}:${sleep}:${activity}:${health}:${food}:${log?.status}`} mode="fasting" context={{ sleep, activity, health, food, status: log?.status ?? "belum direncanakan" }} /> : <p className="text-xs text-warn">Isi waktu tidur antara 0 dan 24 jam untuk meminta saran.</p>}</div>
      <div className="mt-4 space-y-2 text-sm leading-relaxed text-muted"><p className="font-medium text-text">Pegangan sederhana · bukan hasil AI</p><p>Sahur: padukan sumber protein, karbohidrat berserat, sayur atau buah. Berbuka secukupnya dan bagi waktu minum dari berbuka sampai sahur.</p><p>Jaga waktu tidur dengan merencanakan jam istirahat sebelum sahur. Pilih aktivitas ringan sesuai kondisi tubuh.</p><p>Sisihkan satu momen untuk dzikir, rasa syukur, atau membantu seseorang. Tidak perlu mengejar banyak target sekaligus.</p><p className="text-xs">Rujukan: <a className="underline" href="https://www.who.int/bangladesh/news/detail/28-05-2017-stay-healthy-during-ramadan" target="_blank" rel="noreferrer">WHO</a> · <a className="underline" href="https://www.nelft.nhs.uk/news-events/staying-healthy-during-ramadan-15955" target="_blank" rel="noreferrer">NHS</a></p></div>
    </details>
    <details className="mt-3 border-t border-border pt-3"><summary className="cursor-pointer py-2 text-sm">Riwayat puasa ({history.length})</summary><div className="mt-2 space-y-2">{history.length ? history.map((entry) => <div key={entry.date} className="rounded-xl bg-surface-2 p-3 text-sm"><div className="flex justify-between gap-2"><span>{label(entry.date)}</span><span className="text-accent">{statusLabels[entry.status]}</span></div>{entry.note && <p className="mt-1 break-words text-xs text-muted">{entry.note}</p>}</div>) : <p className="text-sm text-muted">Belum ada catatan puasa.</p>}</div></details>
    <p className="mt-3 text-xs leading-relaxed text-muted">Puasa sunnah bersifat pilihan. Periksa kalender setempat; jangan berpuasa pada Idulfitri, Iduladha, dan hari tasyrik. Data disimpan di perangkat ini.</p>
  </Card>;
}
