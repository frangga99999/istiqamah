"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApp, saveJournalEntry, removeJournalEntry } from "@/lib/store";
import { PRAYERS, PRAYER_LABEL, PRAYER_MOOD_LABEL, type JournalEntry, type PrayerLog, type PrayerMood, type PrayerName } from "@/lib/types";
import { hasJournalContent, journalTimeline, tasbihBead } from "@/lib/journal";
import { Button, Card, cx } from "@/components/ui";

const field = "w-full min-w-0 rounded-xl border border-border bg-surface-2 px-3 py-3 text-sm text-text";
const dhikrOptions = ["Subhanallah", "Alhamdulillah", "Allahu akbar", "Astaghfirullah", "La ilaha illallah", "Shalawat"];
const kinds = [{ key: "all", label: "Semua" }, { key: "story", label: "Cerita" }, { key: "prayer", label: "Shalat" }, { key: "dhikr", label: "Dzikir" }];

export function SpiritualJournal({ today, onPrayer, editorOnly = false, entryId, entryKind = "story" }: { today: string; onPrayer?: (log: PrayerLog) => void; editorOnly?: boolean; entryId?: string; entryKind?: JournalEntry["kind"] }) {
  const state = useApp();
  const router = useRouter();
  const [editor, setEditor] = useState<JournalEntry | null>(() => {
    if (!editorOnly) return null;
    if (entryId) return state.journalEntries.find((entry) => entry.id === entryId) ?? null;
    const at = new Date().toISOString();
    return { id: crypto.randomUUID(), date: today, kind: entryKind, title: "", body: "", gratitude: "", nextStep: "", dhikr: dhikrOptions[0], count: 0, draft: true, starred: false, createdAt: at, updatedAt: at };
  });
  const [error, setError] = useState("");
  const [removed, setRemoved] = useState<JournalEntry | null>(null);
  const [query, setQuery] = useState("");
  const [month, setMonth] = useState(today.slice(0, 7));
  const [kind, setKind] = useState("all");
  const [starred, setStarred] = useState(false);
  const drafts = state.journalEntries.filter((entry) => entry.draft);
  const timeline = journalTimeline(state.journalEntries, state.logs, month, query, kind, starred);
  const months = [...new Set([today.slice(0, 7), ...state.logs.map((log) => log.date.slice(0, 7)), ...state.journalEntries.map((entry) => entry.date.slice(0, 7))])].sort().reverse();

  function write(entry: JournalEntry) {
    try { saveJournalEntry(entry); setError(""); return true; }
    catch { setError("Belum tersimpan. Penyimpanan perangkat mungkin penuh. Salin tulisanmu sebelum menutup halaman."); return false; }
  }
  function change(patch: Partial<JournalEntry>) {
    if (!editor) return;
    const next = { ...editor, ...patch, updatedAt: new Date().toISOString() };
    setEditor(next);
    write(next);
  }
  function create(entryKind: JournalEntry["kind"]) {
    router.push(`/history/write?kind=${entryKind}`);
  }
  function finish() {
    if (!editor || !hasJournalContent(editor)) return;
    if (write({ ...editor, draft: false, updatedAt: new Date().toISOString() })) {
      router.push("/history");
    }
  }
  function remove(entry: JournalEntry) {
    try { removeJournalEntry(entry.id); setRemoved(entry); setError(""); }
    catch { setError("Catatan belum bisa dihapus. Coba lagi."); }
  }
  function exportJournal() {
    const data = { exportedAt: new Date().toISOString(), monthlyHopes: state.monthlyIntentions, entries: state.journalEntries, prayerLogs: state.logs, dailyReflections: state.dailyReflections, fastingLogs: state.fastingLogs };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `jurnal-${today}.json`; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  if (editorOnly && !editor) return <div className="py-10 text-sm text-muted">Catatan tidak ditemukan.<Link href="/history" className="mt-4 block text-accent">Kembali ke jurnal</Link></div>;
  return <section className="space-y-5" aria-label="Jurnal spiritual">
    {error && <p role="alert" className="rounded-xl bg-warn-soft p-3 text-sm text-warn">{error}</p>}
    {removed && <div className="flex items-center justify-between rounded-xl bg-surface-2 p-3 text-sm"><span>Catatan dihapus.</span><button className="min-h-11 px-3 font-medium text-accent" onClick={() => { if (write(removed)) setRemoved(null); }}>Urungkan</button></div>}

    {editor ? <div className="pt-[calc(env(safe-area-inset-top)+0.75rem)]">
      <div className="sticky top-0 z-20 mb-6 flex items-center justify-between gap-2 bg-bg/95 py-2 backdrop-blur-sm">
        <button className="min-h-11 px-2 text-sm text-muted" onClick={() => { if (!hasJournalContent(editor) || write(editor)) router.push("/history"); }}>← Kembali</button>
        <Button disabled={!hasJournalContent(editor)} onClick={finish}>Simpan</Button>
      </div>
      <h1 className="mb-6 font-serif text-3xl">{editor.kind === "dhikr" ? "Tasbih" : "Bagaimana harimu?"}</h1>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <label className="min-w-0 space-y-1 text-xs text-muted">Tanggal<input aria-label="Tanggal cerita" type="date" max={today} value={editor.date} onChange={(e) => { if (e.target.value && e.target.value <= today) change({ date: e.target.value }); }} className={field} /></label>
          <label className="min-w-0 space-y-1 text-xs text-muted">Terhubung dengan<select value={editor.prayer ?? ""} onChange={(e) => change({ prayer: (e.target.value || undefined) as PrayerName | undefined })} className={field}><option value="">Momen sehari-hari</option>{PRAYERS.map((p) => <option key={p} value={p}>Shalat {PRAYER_LABEL[p]}</option>)}</select></label>
        </div>
        {editor.kind === "dhikr" && <div className="rounded-3xl border border-border bg-surface p-4 text-center">
          <label className="block text-sm text-muted">Bacaan dzikir<select className={`${field} mt-2`} value={editor.dhikr} onChange={(e) => change({ dhikr: e.target.value, count: 0 })} disabled={editor.count > 0}>{dhikrOptions.map((text) => <option key={text}>{text}</option>)}</select></label>
          <button aria-label={`Tambah hitungan ${editor.dhikr}, sekarang ${editor.count}`} disabled={editor.count >= 99999} onClick={() => change({ count: Math.min(99999, editor.count + 1) })} className="relative mx-auto mt-4 block w-full max-w-72 rounded-3xl text-accent transition-transform duration-150 active:scale-[0.97] disabled:opacity-60">
            <svg viewBox="0 0 280 320" className="w-full" aria-hidden="true">
              <circle cx="140" cy="132" r="105" fill="none" stroke="var(--border-strong)" strokeWidth="2" />
              {Array.from({ length: 33 }, (_, i) => { const angle = -Math.PI / 2 + i * Math.PI * 2 / 33; const active = i === tasbihBead(editor.count); const filled = i <= tasbihBead(editor.count); return <circle key={i} cx={140 + Math.cos(angle) * 105} cy={132 + Math.sin(angle) * 105} r={active ? 10 : 7.5} fill={filled ? "var(--accent)" : "var(--surface-2)"} stroke={filled ? "var(--accent-strong)" : "var(--border-strong)"} strokeWidth="1.5" className="transition-all duration-200" />; })}
              <path d="M140 237v24m-7 15-7 26m14-26v30m7-30 7 26" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" />
              <ellipse cx="140" cy="267" rx="9" ry="13" fill="var(--accent)" />
            </svg>
            <span className="pointer-events-none absolute inset-x-0 top-[28%] flex flex-col items-center"><span key={editor.count} className="tabular text-5xl font-light motion-safe:animate-[ctaIn_160ms_ease-out]">{editor.count}</span><span className="mt-3 text-xs text-muted">ketuk satu kali, satu dzikir</span></span>
          </button>
          <button disabled={!editor.count} onClick={() => change({ count: Math.max(0, editor.count - 1) })} className="min-h-11 rounded-full border border-border px-4 text-sm text-muted disabled:opacity-40">Koreksi −1</button>
          <p className="mt-2 text-xs text-muted">33 butir per putaran. Hitungan terus berlanjut.</p>
        </div>}
        <input aria-label="Judul cerita" className="w-full border-b border-border bg-transparent py-3 text-xl outline-none" value={editor.title} maxLength={100} placeholder="Judul, kalau mau" onChange={(e) => change({ title: e.target.value })} />
        <label className="block text-sm text-muted">Ceritakan dengan bahasamu<textarea className={`${field} journal-paper mt-2 min-h-48 resize-y leading-8`} value={editor.body} maxLength={12000} placeholder="Hari ini aku..." onChange={(e) => change({ body: e.target.value })} /></label>
        <fieldset><legend className="mb-2 text-sm text-muted">Saat ini aku merasa...</legend><div className="flex flex-wrap gap-2">{Object.entries(PRAYER_MOOD_LABEL).map(([key, label]) => <button key={key} aria-pressed={editor.mood === key} onClick={() => change({ mood: editor.mood === key ? undefined : key as PrayerMood })} className={cx("min-h-11 rounded-full border px-3 text-sm", editor.mood === key ? "border-accent bg-accent-soft text-accent" : "border-border text-muted")}>{label}</button>)}</div></fieldset>
        <details className="rounded-xl bg-surface-2 p-3" open={Boolean(editor.gratitude || editor.nextStep) || undefined}><summary className="cursor-pointer py-1 text-sm text-muted">Satu hal yang kusyukuri, satu langkah untuk besok</summary><label className="mt-3 block text-sm text-muted">Aku bersyukur karena...<textarea className={`${field} mt-2`} rows={2} maxLength={1000} value={editor.gratitude} onChange={(e) => change({ gratitude: e.target.value })} /></label><label className="mt-3 block text-sm text-muted">Langkah kecilku berikutnya<textarea className={`${field} mt-2`} rows={2} maxLength={1000} value={editor.nextStep} onChange={(e) => change({ nextStep: e.target.value })} /></label></details>
        <p className="text-xs text-muted" role="status">{error ? "Perubahan belum tersimpan" : !state.journalEntries.some((entry) => entry.id === editor.id) ? "Mulai menulis. Draf akan tersimpan otomatis." : editor.draft ? "Draf tersimpan di perangkat ini" : "Perubahan tersimpan di perangkat ini"}</p>
      </div>
    </div> : <>
      <Card className="relative overflow-hidden p-6">
        <Link href="/history/write" className="block"><p className="text-xs uppercase tracking-widest text-accent">Sejenak untuk diri sendiri</p><h2 className="mt-3 font-serif text-2xl leading-tight">Apa yang ingin kamu simpan<br />dari hari ini?</h2></Link>
        <div className="mt-5 grid grid-cols-2 gap-2"><Button onClick={() => create("story")}>Tulis cerita</Button><Button variant="secondary" onClick={() => create("dhikr")}>Buka tasbih</Button></div>
      </Card>
      {drafts.length > 0 && <div className="space-y-2"><h3 className="text-sm font-medium">Belum selesai bercerita</h3>{drafts.map((draft) => <Link key={draft.id} href={`/history/write?id=${encodeURIComponent(draft.id)}`} className="flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border border-dashed border-accent/40 p-3 text-left text-sm"><span className="min-w-0 truncate">{draft.title || (draft.kind === "dhikr" ? `${draft.dhikr} · ${draft.count} kali` : draft.body || "Draf cerita")}</span><span className="shrink-0 text-accent">Lanjutkan</span></Link>)}</div>}
    </>}

    {!editorOnly && <><div className="space-y-3">
      <div className="flex items-center justify-between"><h2 className="font-serif text-xl">Jejak hari-harimu</h2><button onClick={exportJournal} className="min-h-11 px-2 text-xs text-accent">Ekspor jurnal</button></div>
      <div className="grid grid-cols-[1fr_auto] gap-2"><input aria-label="Cari cerita" type="search" placeholder="Cari cerita, perasaan..." className={field} value={query} onChange={(e) => setQuery(e.target.value)} /><select aria-label="Bulan jurnal" className={`${field} max-w-36`} value={month} onChange={(e) => setMonth(e.target.value)}><option value="">Semua bulan</option>{months.map((m) => <option key={m} value={m}>{new Intl.DateTimeFormat("id-ID", { month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${m}-01T12:00:00Z`))}</option>)}</select></div>
      <div className="flex flex-wrap gap-1.5">{kinds.map((item) => <button key={item.key} aria-pressed={kind === item.key} onClick={() => setKind(item.key)} className={cx("min-h-11 rounded-full px-3 text-xs", kind === item.key ? "bg-accent text-accent-fg" : "bg-surface-2 text-muted")}>{item.label}</button>)}<button aria-pressed={starred} onClick={() => setStarred(!starred)} className={cx("min-h-11 rounded-full px-3 text-xs", starred ? "bg-accent text-accent-fg" : "bg-surface-2 text-muted")}>Disimpan</button></div>
    </div>
    <div className="space-y-4">
      {!timeline.length && <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm leading-relaxed text-muted">{query || starred ? "Belum ada catatan yang cocok. Coba kata lain atau ubah filter." : "Halaman ini masih kosong. Mulai dari satu kalimat hari ini."}</p>}
      {timeline.map((item, i) => <article key={item.id}>
        {(i === 0 || timeline[i - 1].date !== item.date) && <h3 className="mb-3 text-xs font-medium text-muted">{new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${item.date}T12:00:00Z`))}</h3>}
        <Card className="p-4">
          <div className="flex items-start justify-between gap-2"><div><p className="text-[11px] uppercase tracking-wider text-accent">{item.kind === "prayer" ? "Seusai shalat" : item.kind === "dhikr" ? "Momen dzikir" : "Cerita pribadi"}{item.entry?.prayer ? ` · ${PRAYER_LABEL[item.entry.prayer]}` : ""}</p><h4 className="mt-1 font-serif text-xl">{item.title}</h4></div>{item.entry && <button aria-label={item.entry.starred ? "Lepas penanda cerita" : "Tandai cerita berkesan"} aria-pressed={item.entry.starred} onClick={() => write({ ...item.entry!, starred: !item.entry!.starred })} className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-xl text-accent">{item.entry.starred ? "★" : "☆"}</button>}</div>
          {item.kind === "dhikr" && <p className="mt-2 text-sm text-accent">{item.entry?.dhikr} · {item.entry?.count} kali</p>}
          {item.log && <p className="mt-2 text-xs text-muted">{item.log.missed ? "Terlewat, masih ada kesempatan untuk melanjutkan." : "Shalat sudah tercatat."}</p>}
          {item.body && <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-muted">{item.body}</p>}
          {item.entry?.gratitude && <p className="mt-3 border-l-2 border-accent/40 pl-3 text-sm leading-relaxed text-muted"><span className="block text-xs text-accent">Yang kusyukuri</span>{item.entry.gratitude}</p>}
          {item.entry?.nextStep && <p className="mt-3 text-sm text-muted"><span className="block text-xs text-accent">Langkah berikutnya</span>{item.entry.nextStep}</p>}
          <div className="mt-3 flex items-center justify-between gap-2"><span className="text-xs text-accent">{item.mood ? PRAYER_MOOD_LABEL[item.mood] : ""}</span><div>{item.entry && <button className="min-h-11 px-2 text-xs text-muted" onClick={() => { if (confirm("Hapus catatan ini? Kamu bisa mengurungkannya.")) remove(item.entry!); }}>Hapus</button>}<button onClick={() => { if (item.log) onPrayer?.(item.log); else if (item.entry) router.push(`/history/write?id=${encodeURIComponent(item.entry.id)}`); }} className="min-h-11 px-2 text-xs text-muted">{item.log ? "Detail shalat" : "Buka / edit"}</button></div></div>
        </Card>
      </article>)}
    </div>
    <p className="text-xs leading-relaxed text-muted">Catatan dan draf tersimpan di perangkat ini. Cadangan otomatis tersedia jika akses pribadi terhubung. <Link href="/settings" className="underline">Pengaturan data & ekspor</Link></p></>}
  </section>;
}
