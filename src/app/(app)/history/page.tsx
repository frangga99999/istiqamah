"use client";
import { useState } from "react";
import { useApp } from "@/lib/store";
import { PRAYERS, PRAYER_LABEL, type PrayerLog, type PrayerName } from "@/lib/types";
import { formatTime } from "@/lib/prayer/times";
import { delayMinutes } from "@/lib/engine/profile";
import { longDate } from "@/lib/format";
import { localDateKey } from "@/lib/prayer/times";
import { Card, Sheet, cx } from "@/components/ui";
import { LogGlyph } from "@/components/prayer-status";

const LOC_LABEL = { mosque: "Masjid", congregation: "Berjamaah", alone: "Sendiri" } as const;

export default function HistoryPage() {
  const state = useApp();
  const [detail, setDetail] = useState<PrayerLog | null>(null);
  if (!state.settings) return null;
  const tz = state.settings.timezone;

  const today = localDateKey(tz);
  const dates = Array.from(new Set([today, ...state.logs.map((l) => l.date)])).sort((a, b) =>
    b.localeCompare(a),
  );

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold tracking-tight text-text">Riwayat</h1>

      {dates.length === 0 && <p className="text-sm text-muted">Belum ada catatan.</p>}

      <div className="space-y-5">
        {dates.map((date) => {
          const dayDate = new Date(`${date}T12:00:00`);
          return (
            <section key={date}>
              <h2 className="mb-2 px-1 text-sm font-medium text-muted">{longDate(dayDate, tz)}</h2>
              <Card className="divide-y divide-border">
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
                      </span>
                      <span className="tabular text-sm text-subtle">
                        {log?.performed_at ? formatTime(log.performed_at, tz) : "—"}
                      </span>
                    </button>
                  );
                })}
              </Card>
            </section>
          );
        })}
      </div>

      <DetailSheet log={detail} tz={tz} onClose={() => setDetail(null)} />
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
