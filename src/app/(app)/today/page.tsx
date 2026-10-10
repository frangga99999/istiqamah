"use client";
import { useState, type CSSProperties } from "react";
import { useApp, upsertLog } from "@/lib/store";
import { useNow } from "@/lib/use-now";
import { buildToday, type TodayView } from "@/lib/today";
import { PRAYER_LABEL, type PrayerName } from "@/lib/types";
import { formatTime } from "@/lib/prayer/times";
import { longDate } from "@/lib/format";
import { quoteOfDay } from "@/lib/quotes";
import { Button, cx } from "@/components/ui";
import { CheckIn } from "@/components/check-in";
import { DailySchedule } from "@/components/daily-schedule";
import { IconBell, IconCheck, IconChevron, IconClock, IconMosque, IconSpark } from "@/components/icons";
import { notifyStatus, useReminders } from "@/lib/notify";
import Link from "next/link";

export default function TodayPage() {
  const state = useApp();
  const now = useNow(1000); // tick every second for the live countdown ring
  const [checkIn, setCheckIn] = useState<{ prayer: PrayerName; at: Date } | null>(null);
  const [justPrepped, setJustPrepped] = useState(false); // transient confirm state

  const view = state.settings ? buildToday(state, now) : null;
  useReminders(view);
  if (!state.settings || !view) return null; // gate shows splash until onboarded
  const tz = state.settings.timezone;
  const remindersOff = notifyStatus() === "default";
  const quote = quoteOfDay(view.date);
  const monthlyHope = state.monthlyIntentions[view.date.slice(0, 7)];

  const heroRow = view.hero.isTomorrow
    ? undefined
    : view.rows.find((r) => r.prayer === view.hero.prayer);
  const prepStarted = Boolean(heroRow?.log?.preparation_started_at);
  const preparing = view.hero.state === "PREPARATION";
  const urgent = preparing || view.hero.state === "LATE_RISK";

  function startPreparing() {
    if (!view || !heroRow) return;
    upsertLog({
      date: view.date,
      prayer: heroRow.prayer,
      prayer_start_at: heroRow.at.toISOString(),
      preparation_started_at: new Date().toISOString(),
    });
    setJustPrepped(true);
    setTimeout(() => setJustPrepped(false), 1400); // brief acknowledgement
  }

  function tap() {
    if (state.prefs.vibration && typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(12);
    }
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted">{longDate(now, tz)}</p>

      {remindersOff && (
        <Link
          href="/settings"
          className="flex items-center gap-2.5 rounded-xl border border-warn/30 bg-warn-soft px-3.5 py-2.5 text-sm text-warn"
        >
          <IconBell width={16} height={16} className="shrink-0" />
          <span className="flex-1">Pengingat belum aktif</span>
          <IconChevron width={16} height={16} />
        </Link>
      )}

      {/* ── HERO: live countdown ring ────────────────────── */}
      <section aria-label="Shalat hari ini" className="overflow-hidden rounded-3xl border border-border bg-surface">
        <div className="flex items-center justify-between px-5 pt-5"><h2 className="text-base font-semibold">Shalat hari ini</h2><span className="text-xs text-muted">{view.completed} dari 5 terjaga</span></div>
        <div className="px-5 pt-5">
        <CountdownHero view={view} now={now} tz={tz} />
        </div>

      {/* ── TARGET + ACTION ──────────────────────────────── */}
      {!view.hero.isTomorrow && (
        <div
          className={cx(
            "relative overflow-hidden p-5",
            urgent
              ? "border-warn/40 bg-gradient-to-b from-warn-soft/60 to-surface"
              : "border-accent/30 bg-gradient-to-b from-accent-soft/50 to-surface",
          )}
          style={
            {
              ["--glow"]: urgent ? "var(--warn)" : "var(--accent)",
              animation: `heroGlow ${preparing ? 1.8 : 3.4}s ease-in-out infinite`,
            } as CSSProperties
          }
        >
          <div className="flex items-center gap-2 text-sm">
            <span className="text-subtle">Target</span>
            {view.target.mosque && <IconMosque width={17} height={17} className="text-mosque" />}
            <span className="font-medium text-text">{view.target.label}</span>
          </div>

          {view.hero.state === "LATE_RISK" ? (
            <p className="mt-2 text-sm text-warn">
              Belum tercatat. Prioritaskan shalat sebelum melanjutkan aktivitas.
            </p>
          ) : view.hero.isNow ? null : view.prepInMinutes > 0 ? (
            <p className="mt-2 text-sm text-muted">
              Mulai bersiap dalam{" "}
              <span className="tabular font-medium text-text">{view.prepInMinutes} menit</span>
            </p>
          ) : (
            <p className="mt-2 font-medium text-warn">Adzan semakin dekat. Selesaikan aktivitas dan mulai bersiap.</p>
          )}

          <div className="mt-4">
            {view.hero.isNow || prepStarted ? (
              justPrepped ? (
                <Button key="confirm" variant="hero" className="w-full pointer-events-none py-4 text-base" style={{ animation: "prepPop .4s ease-out" }}>
                  <IconCheck width={19} height={19} strokeWidth={2.5} />
                  Bersiap dicatat
                </Button>
              ) : (
                <Button
                  key="catat"
                  variant="hero"
                  className="relative w-full overflow-hidden py-4 text-base"
                  style={{ animation: "ctaIn .32s ease-out" }}
                  onClick={() => {
                    tap();
                    setCheckIn({ prayer: view.hero.prayer, at: view.hero.at });
                  }}
                >
                  <Shine />
                  <IconCheck width={19} height={19} strokeWidth={2.25} />
                  Catat Shalat
                </Button>
              )
            ) : (
              <Button
                variant={preparing ? "urgent" : "hero"}
                className="relative w-full overflow-hidden py-4 text-base"
                onClick={() => {
                  tap();
                  startPreparing();
                }}
              >
                <Shine />
                {preparing ? <IconClock width={19} height={19} /> : <IconMosque width={19} height={19} />}
                {preparing ? "Mulai Bersiap Sekarang" : "Saya Mau Bersiap"}
              </Button>
            )}
          </div>
        </div>
      )}

      <DailySchedule settings={state.settings} now={now} date={view.date} rows={view.rows} onCheckIn={(row) => setCheckIn({ prayer: row.prayer, at: row.at })} />
      </section>

      {/* ── INSIGHT (invisible assistant, §65) ───────────── */}
      {!view.hero.isTomorrow && (
        <div className="flex items-start gap-3 rounded-2xl border border-accent/15 bg-accent-soft/40 p-4">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent/15 text-accent">
            <IconSpark width={18} height={18} />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-accent">Catatan asisten</p>
            <p className="mt-0.5 text-sm leading-relaxed text-text">{view.plan.reason}</p>
          </div>
        </div>
      )}

      {monthlyHope && (
        <Link href="/history" className="block rounded-2xl border border-accent/25 bg-gradient-to-br from-accent-soft/80 to-surface p-5 transition active:scale-[0.99]">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-accent">Harapan bulan ini</p>
          <blockquote className="mt-2 text-[15px] font-medium leading-relaxed text-text">“{monthlyHope}”</blockquote>
          <p className="mt-3 flex items-center gap-1 text-xs text-muted">
            Jaga lewat satu shalat berikutnya
            <IconChevron width={14} height={14} />
          </p>
        </Link>
      )}

      {/* ── Subtle daily quote (§ sweetener) ──────────────── */}
      <figure className="px-3 pt-2 text-center">
        <blockquote className="text-[13px] italic leading-relaxed text-muted">
          “{quote.text}”
        </blockquote>
        <figcaption className="mt-1.5 text-[11px] text-subtle">{quote.source}</figcaption>
      </figure>

      {checkIn && view && (
        <CheckIn
          open
          onClose={() => setCheckIn(null)}
          prayer={checkIn.prayer}
          date={view.date}
          prayerStartISO={checkIn.at.toISOString()}
        />
      )}
    </div>
  );
}

const pad2 = (n: number) => String(n).padStart(2, "0");

// Live countdown ring: the arc fills as `now` moves from the previous prayer to the
// next, a marker shows when to start preparing, and the clock ticks each second —
// so the next prayer feels near and users can get ready (PRD §19, §132).
function CountdownHero({ view, now, tz }: { view: TodayView; now: Date; tz: string }) {
  const { hero, intervalStart, prepAt } = view;
  const nowMs = now.getTime();
  const start = intervalStart.getTime();
  const target = hero.at.getTime();
  const span = Math.max(1, target - start);
  const progress = hero.isNow ? 1 : Math.min(1, Math.max(0, (nowMs - start) / span));
  const prepFrac = Math.min(1, Math.max(0, (prepAt.getTime() - start) / span));
  const remaining = Math.max(0, target - nowMs);

  const h = Math.floor(remaining / 3_600_000);
  const m = Math.floor(remaining / 60_000) % 60;
  const s = Math.floor(remaining / 1000) % 60;
  const big = hero.isNow ? "Masuk" : h > 0 ? `${h}:${pad2(m)}:${pad2(s)}` : `${m}:${pad2(s)}`;
  const nextSeconds = Math.max(0, Math.ceil((view.next.at.getTime() - nowMs) / 1000));
  const nextCountdown = `${Math.floor(nextSeconds / 3600)}:${pad2(Math.floor(nextSeconds / 60) % 60)}:${pad2(nextSeconds % 60)}`;

  const late = hero.state === "LATE_RISK";
  const preparing = hero.state === "PREPARATION";
  const urgent = late || preparing;
  const color = urgent ? "var(--warn)" : view.target.mosque ? "var(--mosque)" : "var(--accent)";
  const R = 52;
  const C = 2 * Math.PI * R;
  const mx = 60 + R * Math.cos(2 * Math.PI * prepFrac);
  const my = 60 + R * Math.sin(2 * Math.PI * prepFrac);
  const prepReached = nowMs >= prepAt.getTime();

  return (
    <div className="flex flex-col items-center">
      {/* Prominent prayer name — countdown + adzan time stay in the ring below. */}
      <div className="mb-3 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.2em]" style={{ color }}>
          {late ? "segera tunaikan" : preparing ? "saatnya bersiap" : hero.isNow ? "waktunya" : hero.isTomorrow ? "besok" : "menuju"}
        </p>
        <h1 className="mt-1 text-[34px] font-bold leading-none tracking-tight text-text">
          {PRAYER_LABEL[hero.prayer]}
        </h1>
      </div>

      <div className="relative flex h-[220px] w-[220px] items-center justify-center">
        <svg viewBox="0 0 120 120" className="absolute inset-0 h-full w-full -rotate-90">
          <circle cx="60" cy="60" r={R} fill="none" stroke="var(--surface-2)" strokeWidth="7" />
          <circle
            cx="60"
            cy="60"
            r={R}
            fill="none"
            stroke={color}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - progress)}
            style={{ transition: "stroke-dashoffset 1s linear", filter: `drop-shadow(0 0 5px ${color})` }}
          />
          {!hero.isNow && prepFrac > 0.02 && prepFrac < 0.99 && (
            <circle cx={mx} cy={my} r="4.5" fill="var(--surface)" stroke={color} strokeWidth="2.5" />
          )}
        </svg>

        {/* gentle breathing halo, warmer/faster when it's time to get ready */}
        <div
          className="pointer-events-none absolute inset-4 rounded-full"
          style={
            {
              animation: `ringPulse ${prepReached && !hero.isNow ? 1.6 : 3}s ease-in-out infinite`,
              ["--glow"]: color,
            } as CSSProperties
          }
        />

        <div className="relative z-10 px-6 text-center">
          <p className="tabular text-[34px] font-bold leading-none text-text">{big}</p>
          <p className="mt-2 text-xs text-subtle">
            {hero.isNow ? "waktunya shalat" : `adzan · ${formatTime(hero.at, tz)}`}
          </p>
        </div>
      </div>
      {hero.isNow && <p className="mb-4 mt-3 text-center text-xs text-muted">Menuju {PRAYER_LABEL[view.next.prayer]}{view.next.isTomorrow ? " besok" : ""} · <span className="tabular font-semibold text-accent">{nextCountdown}</span> lagi · {formatTime(view.next.at, tz)}</p>}
    </div>
  );
}

// Subtle light sweep across the primary CTA — draws the eye without distracting.
function Shine() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={{
        transform: "translateX(-100%)",
        animation: "shine 3s ease-in-out infinite",
        background: "linear-gradient(100deg, transparent 20%, rgba(255,255,255,0.28) 50%, transparent 80%)",
      }}
    />
  );
}
