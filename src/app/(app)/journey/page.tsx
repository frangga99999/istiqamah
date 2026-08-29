"use client";
import { useState } from "react";
import { setGoal, useApp } from "@/lib/store";
import { computeJourney, PRAYER_LABEL } from "@/lib/journey";
import { Button, Card, cx } from "@/components/ui";
import { IconMosque, IconSpark, IconTrend } from "@/components/icons";

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

      {/* Weekly progress (§52) */}
      <section>
        <h2 className="mb-2 px-1 text-sm font-medium text-muted">Minggu ini</h2>
        <div className="grid grid-cols-2 gap-2.5">
          <Metric label="Shalat wajib" value={j.week.completed} of={j.week.expected} tone="accent" />
          <Metric label="Awal waktu" value={j.week.onTime} of={j.week.expected} tone="ok" />
          <Metric label="Di masjid" value={j.week.mosque} of={j.week.expected} tone="mosque" />
          <Metric label="Sunnah" value={j.week.sunnah} unit="kali" tone="accent" />
        </div>
      </section>

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

function Metric({
  label,
  value,
  of,
  unit,
  tone,
}: {
  label: string;
  value: number;
  of?: number;
  unit?: string;
  tone: "accent" | "ok" | "mosque";
}) {
  const pct = of ? Math.min(100, Math.round((value / of) * 100)) : 0;
  const bar = tone === "ok" ? "bg-ok" : tone === "mosque" ? "bg-mosque" : "bg-accent";
  return (
    <Card className="p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 tabular text-2xl font-semibold text-text">
        {value}
        {of != null && <span className="text-base font-normal text-subtle"> / {of}</span>}
        {unit && <span className="text-base font-normal text-subtle"> {unit}</span>}
      </p>
      {of != null && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
          <div className={cx("h-full rounded-full", bar)} style={{ width: `${pct}%` }} />
        </div>
      )}
    </Card>
  );
}
