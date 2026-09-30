"use client";
import { useState } from "react";
import { setMonthlyIntention, useApp } from "@/lib/store";
import {
  PRAYERS,
  PRAYER_LABEL,
  PRAYER_MOOD_LABEL,
  type PrayerLog,
  type PrayerName,
} from "@/lib/types";
import { formatTime, localDateKey, scheduleForDay } from "@/lib/prayer/times";
import { delayMinutes } from "@/lib/engine/profile";
import { longDate } from "@/lib/format";
import { Card, Sheet, cx } from "@/components/ui";
import { LogGlyph } from "@/components/prayer-status";
import { IconChevron } from "@/components/icons";

const LOC_LABEL = { mosque: "Masjid", congregation: "Berjamaah", alone: "Sendiri" } as const;

const RANGES = [
  { key: "yesterday", label: "Kemarin" },
  { key: "3d", label: "3 Hari" },
  { key: "7d", label: "7 Hari" },
  { key: "30d", label: "Bulanan" },
] as const;
type RangeKey = (typeof RANGES)[number]["key"];

// Date keys (YYYY-MM-DD, tz-aware) for the selected range, most-recent first.
function rangeDateKeys(tz: string, range: RangeKey): string[] {
  const fmt = (d: Date) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  const now = new Date();
  if (range === "yesterday") {
    const d = new Date(now);
    d.setDate(d.getDate() - 1);
    return [fmt(d)];
  }
  const n = range === "3d" ? 3 : range === "7d" ? 7 : 30;
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    return fmt(d);
  });
}

export default function HistoryPage() {
  const state = useApp();
  const [detail, setDetail] = useState<PrayerLog | null>(null);
  const [tab, setTab] = useState<"journal" | "history">("journal");
  const [range, setRange] = useState<RangeKey>("7d");
  const [expanded, setExpanded] = useState<Set<string>>(new Set()); // collapsed by default
  const [editingIntention, setEditingIntention] = useState(false);
  const [intentionDraft, setIntentionDraft] = useState("");
  const toggleDay = (d: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(d)) next.delete(d);
      else next.add(d);
      return next;
    });
  if (!state.settings) return null;
  const tz = state.settings.timezone;

  const dates = rangeDateKeys(tz, range); // most-recent first
  const inRange = new Set(dates);
  const performed = state.logs.filter((l) => inRange.has(l.date) && l.performed_at);
  const summary = {
    total: performed.length,
    mosque: performed.filter((l) => l.performed_location === "mosque").length,
    onTime: performed.filter((l) => {
      const d = delayMinutes(l);
      return d != null && d <= 20;
    }).length,
  };
  // Only render days that actually have entries — no wall of empty days.
  const loggedDates = dates.filter((d) => state.logs.some((l) => l.date === d));

  // Per-prayer status for the header circles: done / missed (red) / not-yet.
  const now = new Date();
  const todayKey = localDateKey(tz);
  const todaySchedule = scheduleForDay(state.settings, now);
  const monthKey = todayKey.slice(0, 7);
  const intention = state.monthlyIntentions[monthKey] ?? "";
  const elapsedPrayers =
    (Number(todayKey.slice(8, 10)) - 1) * 5 +
    PRAYERS.filter((prayer) => new Date(todaySchedule.times[prayer]).getTime() <= now.getTime()).length;
  const monthDone = state.logs.filter((log) => log.date.startsWith(monthKey) && log.performed_at).length;
  const monthProgress = elapsedPrayers ? Math.min(100, Math.round((monthDone / elapsedPrayers) * 100)) : 0;
  const monthLabel = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric", timeZone: tz }).format(now);
  const reflections = state.logs
    .filter((log) => log.date.startsWith(monthKey) && (log.note || log.mood))
    .sort((a, b) => b.date.localeCompare(a.date));
  const circleState = (d: string, p: PrayerName, log?: PrayerLog): "done" | "missed" | "upcoming" => {
    if (log?.performed_at) return "done";
    if (log?.missed) return "missed";
    if (d < todayKey) return "missed";
    if (d === todayKey) {
      return new Date(todaySchedule.times[p]).getTime() <= now.getTime() ? "missed" : "upcoming";
    }
    return "upcoming";
  };

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold tracking-tight text-text">Jurnal</h1>

      <div className="grid grid-cols-2 rounded-xl bg-surface-2 p-1" role="tablist" aria-label="Isi jurnal">
        <button
          role="tab"
          aria-selected={tab === "journal"}
          onClick={() => setTab("journal")}
          className={cx("rounded-lg px-4 py-2.5 text-sm font-medium transition", tab === "journal" ? "bg-surface text-text shadow-sm" : "text-muted")}
        >
          Jurnal
        </button>
        <button
          role="tab"
          aria-selected={tab === "history"}
          onClick={() => setTab("history")}
          className={cx("rounded-lg px-4 py-2.5 text-sm font-medium transition", tab === "history" ? "bg-surface text-text shadow-sm" : "text-muted")}
        >
          Riwayat
        </button>
      </div>

      {tab === "journal" ? (
        <>
      <Card className="overflow-hidden border-accent/30 bg-gradient-to-br from-accent-soft/80 via-surface to-surface p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-accent">Harapan Bulan Ini</p>
            <p className="mt-0.5 text-xs capitalize text-subtle">{monthLabel}</p>
          </div>
          {intention && !editingIntention && (
            <button
              onClick={() => {
                setIntentionDraft(intention);
                setEditingIntention(true);
              }}
              className="rounded-full border border-border px-3 py-1.5 text-xs text-muted hover:text-text"
            >
              Ubah
            </button>
          )}
        </div>
        {intention && !editingIntention ? (
          <blockquote className="mt-5 text-lg font-semibold leading-relaxed text-text">“{intention}”</blockquote>
        ) : (
          <div className="mt-4 space-y-3">
            <textarea
              value={intentionDraft}
              onChange={(event) => setIntentionDraft(event.target.value)}
              maxLength={280}
              rows={3}
              placeholder="Contoh: Semoga bulan ini aku lebih tenang dan menjaga Ashar tepat waktu."
              className="w-full resize-none rounded-2xl border border-border bg-surface-2 px-4 py-3 text-sm text-text outline-none transition placeholder:text-subtle focus:border-accent"
            />
            <div className="flex justify-end gap-2">
              {editingIntention && (
                <button onClick={() => setEditingIntention(false)} className="px-3 py-2 text-sm text-muted">
                  Batal
                </button>
              )}
              <button
                disabled={!intentionDraft.trim()}
                onClick={() => {
                  setMonthlyIntention(monthKey, intentionDraft);
                  setEditingIntention(false);
                }}
                className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-accent-fg disabled:opacity-40"
              >
                Simpan harapan
              </button>
            </div>
          </div>
        )}
        <div className="mt-5 border-t border-border pt-4">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted">Shalat terjaga bulan ini</span>
            <span className="tabular font-medium text-text">{monthDone} dari {elapsedPrayers}</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${monthProgress}%` }} />
          </div>
          <p className="mt-2 text-xs text-subtle">Setiap catatan shalat membantu melihat perjalanan harapanmu.</p>
        </div>
      </Card>

      <Card className="p-5">
        <p className="text-sm font-semibold text-text">Harapan yang dijalani</p>
        <p className="mt-1 text-xs leading-relaxed text-subtle">Harapan menjadi lebih nyata saat diikuti tindakan dan refleksi.</p>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <FocusStep number="1" label="Bayangkan" detail="ingat harapanmu" />
          <FocusStep number="2" label="Jalani" detail="jaga satu shalat" />
          <FocusStep number="3" label="Renungkan" detail="catat perasaan" />
        </div>
      </Card>

      <section>
        <div className="mb-3 px-1">
          <p className="text-sm font-semibold text-text">Refleksi bulan ini</p>
          <p className="mt-0.5 text-xs text-subtle">Cerita dan perasaan setelah shalat.</p>
        </div>
        {reflections.length ? (
          <div className="space-y-2.5">
            {reflections.map((log) => (
              <button key={log.id} onClick={() => setDetail(log)} className="w-full rounded-2xl border border-border bg-surface p-4 text-left transition hover:bg-surface-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-text">{PRAYER_LABEL[log.prayer]}</span>
                  <span className="text-xs text-subtle">{longDate(new Date(`${log.date}T12:00:00`), tz)}</span>
                </div>
                {log.note && <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted">{log.note}</p>}
                {log.mood && <span className="mt-2 inline-block rounded-full bg-accent-soft px-2.5 py-1 text-xs text-accent">{PRAYER_MOOD_LABEL[log.mood]}</span>}
              </button>
            ))}
          </div>
        ) : (
          <Card className="p-5 text-center text-sm text-muted">Refleksi pertamamu akan muncul setelah mencatat shalat.</Card>
        )}
      </section>
        </>
      ) : (
        <>
      <div>
        <p className="text-sm font-semibold text-text">Riwayat shalat</p>
        <p className="mt-0.5 text-xs text-subtle">Lihat waktu dan konsistensi shalatmu.</p>
      </div>

      {/* Range filter (§ user request: yesterday / 3d / 7d / monthly) */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {RANGES.map((r) => (
          <button
            key={r.key}
            onClick={() => setRange(r.key)}
            className={cx(
              "shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              range === r.key
                ? "bg-accent text-accent-fg"
                : "bg-surface-2 text-muted hover:text-text",
            )}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Range summary */}
      <Card className="flex items-stretch divide-x divide-border p-0">
        <SummaryStat value={summary.total} label="Shalat" />
        <SummaryStat value={summary.onTime} label="Tepat waktu" tone="ok" />
        <SummaryStat value={summary.mosque} label="Di masjid" tone="mosque" />
      </Card>

      {loggedDates.length === 0 && (
        <p className="px-1 text-sm text-muted">Belum ada catatan pada rentang ini.</p>
      )}

      <div className="space-y-3">
        {loggedDates.map((date) => {
          const dayDate = new Date(`${date}T12:00:00`);
          const dayLogs = PRAYERS.map((p) => state.logs.find((l) => l.date === date && l.prayer === p));
          const doneCount = dayLogs.filter((l) => l?.performed_at).length;
          const isOpen = expanded.has(date);
          return (
            <Card key={date} className="overflow-hidden">
              <button
                onClick={() => toggleDay(date)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-surface-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text">{longDate(dayDate, tz)}</p>
                  <div className="mt-2.5 flex items-center gap-2">
                    {PRAYERS.map((p, i) => (
                      <PrayerCircle key={p} prayer={p} log={dayLogs[i]} state={circleState(date, p, dayLogs[i])} />
                    ))}
                  </div>
                </div>
                <span className="flex shrink-0 items-center gap-2 text-sm text-subtle">
                  <span className="tabular">{doneCount}/5</span>
                  <IconChevron
                    width={16}
                    height={16}
                    className={cx("transition-transform duration-200", isOpen && "rotate-90")}
                  />
                </span>
              </button>

              {isOpen && (
                <div className="divide-y divide-border border-t border-border">
                  {PRAYERS.map((prayer) => {
                    const log = state.logs.find((l) => l.date === date && l.prayer === prayer);
                    const done = Boolean(log?.performed_at);
                    return (
                      <button
                        key={prayer}
                        disabled={!log}
                        onClick={() => log && setDetail(log)}
                        className={cx(
                          "flex w-full items-center justify-between px-4 py-3 text-left",
                          log ? "hover:bg-surface-2" : "cursor-default",
                        )}
                      >
                        <span className="flex items-center gap-3">
                          <LogGlyph performed={done} loc={log?.performed_location} />
                          <span className={cx("text-[15px]", done ? "text-text" : "text-subtle")}>
                            {PRAYER_LABEL[prayer]}
                          </span>
                          {log?.performed_location === "mosque" && (
                            <span className="rounded-full bg-mosque-soft px-2 py-0.5 text-[11px] text-mosque">
                              masjid
                            </span>
                          )}
                          {log?.mood && (
                            <span className="text-xs text-subtle">{PRAYER_MOOD_LABEL[log.mood]}</span>
                          )}
                          {log?.missed && <span className="text-xs font-medium text-danger">Terlewat</span>}
                        </span>
                        <span className="tabular text-sm text-subtle">
                          {log?.performed_at ? formatTime(log.performed_at, tz) : "—"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </Card>
          );
        })}
      </div>
        </>
      )}

      <DetailSheet log={detail} tz={tz} onClose={() => setDetail(null)} />
    </div>
  );
}

function FocusStep({ number, label, detail }: { number: string; label: string; detail: string }) {
  return (
    <div className="rounded-xl bg-surface-2 px-2 py-3">
      <span className="mx-auto grid h-6 w-6 place-items-center rounded-full bg-accent-soft text-xs font-semibold text-accent">{number}</span>
      <p className="mt-2 text-xs font-medium text-text">{label}</p>
      <p className="mt-1 text-[10px] leading-tight text-subtle">{detail}</p>
    </div>
  );
}

const INITIAL: Record<PrayerName, string> = { fajr: "S", dhuhr: "D", asr: "A", maghrib: "M", isha: "I" };

// Medium circle with the prayer's initial for the collapsed day header.
// Done → its location colour; missed → red; not-yet → faint outline.
function PrayerCircle({
  prayer,
  log,
  state,
}: {
  prayer: PrayerName;
  log?: PrayerLog;
  state: "done" | "missed" | "upcoming";
}) {
  const base = "grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-semibold";
  const letter = INITIAL[prayer];
  if (state === "done") {
    const bg =
      log?.performed_location === "mosque"
        ? "bg-mosque"
        : log?.performed_location === "congregation"
          ? "bg-accent"
          : "bg-ok";
    return <span className={cx(base, bg, "text-white")}>{letter}</span>;
  }
  if (state === "missed") {
    return <span className={cx(base, "bg-red-500/15 text-red-400 ring-1 ring-red-500/40")}>{letter}</span>;
  }
  return <span className={cx(base, "border border-border-strong font-medium text-subtle")}>{letter}</span>;
}

function SummaryStat({ value, label, tone }: { value: number; label: string; tone?: "ok" | "mosque" }) {
  return (
    <div className="flex-1 px-3 py-3.5 text-center">
      <p
        className={cx(
          "tabular text-xl font-semibold",
          tone === "ok" ? "text-ok" : tone === "mosque" ? "text-mosque" : "text-text",
        )}
      >
        {value}
      </p>
      <p className="mt-0.5 text-xs text-subtle">{label}</p>
    </div>
  );
}

function DetailSheet({ log, tz, onClose }: { log: PrayerLog | null; tz: string; onClose: () => void }) {
  const d = log ? delayMinutes(log) : null;
  return (
    <Sheet open={Boolean(log)} onClose={onClose} title={log ? PRAYER_LABEL[log.prayer as PrayerName] : ""}>
      {log && (
        <div className="space-y-1">
          <Row label="Masuk waktu" value={formatTime(log.prayer_start_at, tz)} />
          {log.preparation_started_at && (
            <Row label="Mulai bersiap" value={formatTime(log.preparation_started_at, tz)} />
          )}
          <Row label="Shalat" value={log.performed_at ? formatTime(log.performed_at, tz) : "—"} />
          {log.missed && <Row label="Status" value="Terlewat" tone="warn" />}
          {d != null && (
            <Row
              label="Keterlambatan"
              value={d <= 0 ? "tepat waktu" : `${d} menit`}
              tone={d > 20 ? "warn" : "ok"}
            />
          )}
          {log.performed_location && <Row label="Lokasi" value={LOC_LABEL[log.performed_location]} />}
          <Row
            label="Sunnah"
            value={
              [log.sunnah_before && "sebelum", log.sunnah_after && "sesudah"].filter(Boolean).join(" · ") ||
              "—"
            }
          />
          {log.mood && <Row label="Perasaan" value={PRAYER_MOOD_LABEL[log.mood]} />}
          {log.note && (
            <div className="mt-2 rounded-2xl bg-surface-2 p-4">
              <p className="text-xs text-subtle">Catatan</p>
              <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-text">{log.note}</p>
            </div>
          )}
          {log.manual_time && <p className="pt-2 text-xs text-subtle">Waktu dikoreksi manual.</p>}
        </div>
      )}
    </Sheet>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: "ok" | "warn" }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <span className="text-sm text-muted">{label}</span>
      <span
        className={cx(
          "text-sm font-medium",
          tone === "warn" ? "text-warn" : tone === "ok" ? "text-ok" : "text-text",
        )}
      >
        {value}
      </span>
    </div>
  );
}
