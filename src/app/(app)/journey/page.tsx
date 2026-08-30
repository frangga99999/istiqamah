"use client";
import { useState } from "react";
import { setGoal, useApp } from "@/lib/store";
import { computeJourney, PRAYER_LABEL, type WeekMetrics } from "@/lib/journey";
import type { BehaviorProfile } from "@/lib/types";
import { Button, Card, cx } from "@/components/ui";
import { IconClock, IconMosque, IconSpark, IconTrend } from "@/components/icons";

const RISK_BAR: Record<string, string> = {
  LOW: "bg-ok",
  MEDIUM: "bg-accent",
  HIGH: "bg-warn",
  VERY_HIGH: "bg-danger",
};

export default function JourneyPage() {
  const state = useApp();
  const [dismissed, setDismissed] = useState(false);
  if (!state.settings) return null;
  const j = computeJourney(state);

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold tracking-tight text-text">Perjalanan</h1>

      {/* Current focus (§51) */}
      {j.focus && (
        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-subtle">Fokus saat ini</p>
          <div className="mt-2 flex items-start gap-2.5">
            {j.focus.goal_type === "mosque" && (
              <IconMosque width={22} height={22} className="mt-0.5 shrink-0 text-mosque" />
            )}
            <div>
              <p className="text-lg font-semibold leading-snug text-text">{j.focus.label}</p>
              {j.focus.subtext && <p className="mt-1 text-sm text-muted">{j.focus.subtext}</p>}
            </div>
          </div>
        </Card>
      )}

      {/* Promotion (§57) */}
      {j.promotion?.ready && !dismissed && (
        <Card className="border-accent/40 bg-accent-soft p-5">
          <p className="text-sm font-medium text-accent">Siap meningkatkan target?</p>
          <p className="mt-1 text-[15px] font-semibold text-text">{j.promotion.next.label}</p>
          {j.promotion.next.subtext && (
            <p className="mt-1 text-sm text-muted">{j.promotion.next.subtext}</p>
          )}
          <div className="mt-4 flex gap-2">
            <Button
              className="flex-1"
              onClick={() => {
                setGoal(j.promotion!.next);
                setDismissed(true);
              }}
            >
              Ambil target ini
            </Button>
            <Button variant="ghost" className="flex-1" onClick={() => setDismissed(true)}>
              Tetap
            </Button>
          </div>
        </Card>
      )}

      {/* Weekly insight — warm and plain-language (§52 reframed for everyone) */}
      <WeeklyInsight week={j.week} delayDelta={j.delayDelta} />

      {/* Per-prayer comparison chart (easy visual comparison) */}
      <PrayerComparison rows={j.perPrayer} />

      {/* Trend (§53) */}
      {j.week.avgDelay != null && (
        <Card className="p-5">
          <div className="flex items-center gap-2">
            <IconTrend width={16} height={16} className="text-muted" />
            <p className="text-sm text-muted">Rata-rata keterlambatan</p>
          </div>
          <div className="mt-3 flex items-end justify-between">
            <div>
              <p className="text-xs text-subtle">Minggu lalu</p>
              <p className="tabular text-lg font-medium text-muted">
                {j.prev.avgDelay != null ? `${j.prev.avgDelay} mnt` : "—"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-subtle">Minggu ini</p>
              <p className="tabular text-2xl font-semibold text-text">{j.week.avgDelay} mnt</p>
            </div>
          </div>
          {j.delayDelta != null && j.delayDelta !== 0 && (
            <p
              className={cx(
                "mt-3 text-sm font-medium",
                j.delayDelta > 0 ? "text-ok" : "text-warn",
              )}
            >
              {j.delayDelta > 0 ? "↓" : "↑"} {Math.abs(j.delayDelta)} menit{" "}
              {j.delayDelta > 0 ? "lebih cepat" : "lebih lambat"}
            </p>
          )}
        </Card>
      )}

      {/* Most-improved insight (§64) */}
      {j.mostImproved && (
        <div className="flex items-start gap-2.5 px-1 text-[13px] leading-relaxed text-muted">
          <IconSpark width={16} height={16} className="mt-0.5 shrink-0 text-accent" />
          <p>
            {PRAYER_LABEL[j.mostImproved.prayer]} membaik paling banyak — dari {j.mostImproved.from}{" "}
            menjadi {j.mostImproved.to} menit.
          </p>
        </div>
      )}
    </div>
  );
}

const STATUS: Record<string, { label: string; pill: string }> = {
  LOW: { label: "Baik", pill: "bg-ok/15 text-ok" },
  MEDIUM: { label: "Cukup", pill: "bg-accent/15 text-accent" },
  HIGH: { label: "Perlu perhatian", pill: "bg-warn/15 text-warn" },
  VERY_HIGH: { label: "Perlu fokus", pill: "bg-danger/15 text-danger" },
};

// Per-prayer comparison, worst-first, with a qualitative tag + colour legend so
// the numbers are immediately meaningful (§64).
function PrayerComparison({ rows }: { rows: BehaviorProfile[] }) {
  if (!rows.some((r) => r.sample_size > 0)) return null;
  const max = Math.max(15, ...rows.map((r) => r.average_delay));
  const sorted = [...rows].sort((a, b) => Number(b.sample_size > 0) - Number(a.sample_size > 0) || b.average_delay - a.average_delay);

  return (
    <Card className="p-5">
      <p className="text-sm font-medium text-muted">Perbandingan per shalat</p>
      <p className="mt-0.5 text-xs text-subtle">Rata-rata keterlambatan — makin pendek makin baik</p>

      <div className="mt-4 space-y-3.5">
        {sorted.map((r) => {
          const has = r.sample_size > 0;
          const pct = has ? Math.max(6, Math.round((r.average_delay / max) * 100)) : 0;
          const s = STATUS[r.risk_level];
          return (
            <div key={r.prayer}>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[15px] text-text">{PRAYER_LABEL[r.prayer]}</span>
                <span className="flex items-center gap-2">
                  {has && (
                    <span className={cx("rounded-full px-2 py-0.5 text-[11px] font-medium", s.pill)}>
                      {s.label}
                    </span>
                  )}
                  <span className="tabular w-9 text-right text-sm font-medium text-text">
                    {has ? `${r.average_delay}m` : "—"}
                  </span>
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-surface-2">
                {has && (
                  <div
                    className={cx("h-full rounded-full transition-all duration-500", RISK_BAR[r.risk_level])}
                    style={{ width: `${pct}%` }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-border pt-3 text-[11px] text-subtle">
        <Legend color="bg-ok" label="Baik" />
        <Legend color="bg-accent" label="Cukup" />
        <Legend color="bg-warn" label="Perhatian" />
        <Legend color="bg-danger" label="Fokus" />
      </div>
    </Card>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cx("h-2 w-2 rounded-full", color)} />
      {label}
    </span>
  );
}

// Friendly, non-technical weekly summary: a warm headline + a plain sentence with
// the key number, then a few human highlights instead of raw ratios.
function WeeklyInsight({ week, delayDelta }: { week: WeekMetrics; delayDelta: number | null }) {
  const rate = week.expected ? week.completed / week.expected : 0;
  const headline =
    rate >= 0.9
      ? "MasyaAllah, minggu yang terjaga 🌙"
      : rate >= 0.7
        ? "Langkah yang baik minggu ini 🌱"
        : rate >= 0.4
          ? "Terus semangat, sedikit lagi"
          : "Yuk, mulai lagi pelan-pelan";

  const highlights: { icon: typeof IconMosque; tone: string; text: string }[] = [
    {
      icon: IconMosque,
      tone: "text-mosque",
      text: week.mosque > 0 ? `${week.mosque} kali berjamaah di masjid` : "Belum sempat ke masjid — coba sekali",
    },
    { icon: IconClock, tone: "text-ok", text: `${week.onTime} shalat tepat di awal waktu` },
    {
      icon: IconSpark,
      tone: "text-accent",
      text: week.sunnah > 0 ? `${week.sunnah} shalat sunnah tertunaikan` : "Coba tambah satu shalat sunnah",
    },
  ];
  if (delayDelta && delayDelta > 0)
    highlights.push({ icon: IconTrend, tone: "text-ok", text: `${delayDelta} menit lebih cepat dari minggu lalu` });

  return (
    <Card className="p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-subtle">Minggu ini</p>
      <h2 className="mt-1.5 text-lg font-semibold leading-snug text-text">{headline}</h2>
      <p className="mt-1 text-[15px] leading-relaxed text-muted">
        Kamu menjaga{" "}
        <span className="font-semibold text-text">
          {week.completed} dari {week.expected}
        </span>{" "}
        shalat wajib.
      </p>
      <div className="mt-4 space-y-3 border-t border-border pt-4">
        {highlights.map((h, i) => (
          <div key={i} className="flex items-center gap-3">
            <h.icon width={18} height={18} className={cx("shrink-0", h.tone)} />
            <span className="text-sm text-text">{h.text}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
