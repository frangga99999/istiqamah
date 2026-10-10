"use client";
import { useMemo } from "react";
import Link from "next/link";
import { dhuhaWindow, formatTime, scheduleForDay } from "@/lib/prayer/times";
import { PRAYERS, PRAYER_LABEL, type PrayerSettings } from "@/lib/types";
import { cx } from "@/components/ui";
import type { PrayerRow } from "@/lib/today";
import { IconChevron } from "@/components/icons";

export function DailySchedule({ settings, now, date, rows, onCheckIn }: { settings: PrayerSettings; now: Date; date: string; rows: PrayerRow[]; onCheckIn: (row: PrayerRow) => void }) {
  // The civil date is the invalidation key; the countdown's second ticks don't recalculate astronomy.
  const times = useMemo(() => {
    const reference = new Date(`${date}T12:00:00Z`);
    // Noon UTC can be tomorrow in UTC+13/14; locate this civil date using a local-noon reference instead.
    const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: settings.timezone, year: "numeric", month: "2-digit", day: "2-digit" });
    while (formatter.format(reference) > date) reference.setUTCHours(reference.getUTCHours() - 1);
    while (formatter.format(reference) < date) reference.setUTCHours(reference.getUTCHours() + 1);
    return { schedule: scheduleForDay(settings, reference), dhuha: dhuhaWindow(settings, reference) };
  }, [settings, date]);
  const upcoming = PRAYERS.find((p) => new Date(times.schedule.times[p]) > now);
  const dhuha = times.dhuha;
  const active = Boolean(dhuha && now >= dhuha.start && now < dhuha.end);
  const cells = ["fajr", "dhuha", "dhuhr", "asr", "maghrib", "isha"] as const;
  return <section aria-label="Jadwal dan catatan shalat" className="overflow-hidden border-t border-border">
    <div className="flex items-center justify-between px-5 pt-5 pb-3"><h2 className="text-base font-semibold">Jadwal & catatan</h2><span className="text-xs text-muted">{rows.filter((row) => row.log?.performed_at).length} / 5 tercatat</span></div>
    <ul className="divide-y divide-border px-5">
      {cells.map((p) => {
        const isDhuha = p === "dhuha";
        const label = p === "dhuha" ? "Dhuha" : PRAYER_LABEL[p];
        const selected = isDhuha ? active : p === upcoming;
        const row = rows.find((item) => item.prayer === p);
        const done = Boolean(row?.log?.performed_at);
        const missed = Boolean(row?.log?.missed);
        const entered = Boolean(row && row.at <= now);
        const status = done ? `Shalat ${formatTime(row!.log!.performed_at!, settings.timezone)}` : missed ? "Terlewat · ubah catatan" : entered ? "Belum tercatat · ketuk untuk mencatat" : selected ? "Berikutnya" : "Belum masuk waktu";
        const content = <><span className="min-w-0"><span className={cx("block text-lg font-semibold", missed && "text-danger")}>{label}</span><span className={cx("mt-1 block text-xs leading-relaxed", missed ? "text-danger" : "text-muted")}>{isDhuha ? active ? "Waktunya Dhuha" : "Sunnah" : status}</span></span><span className="flex shrink-0 items-center gap-2"><span className="tabular text-base font-semibold">{isDhuha ? dhuha ? `${formatTime(dhuha.start, settings.timezone)}–${formatTime(dhuha.end, settings.timezone)}` : "Tidak tersedia" : formatTime(times.schedule.times[p], settings.timezone)}</span>{entered && <IconChevron width={14} height={14} className="text-muted" />}</span></>;
        return <li key={p} className={cx(selected && "bg-accent-soft/30", missed && "bg-danger-soft/30")}>
          {row ? <button disabled={!entered} aria-label={`${label}, adzan ${formatTime(row.at, settings.timezone)}, ${status}`} onClick={() => onCheckIn(row)} className="flex min-h-20 w-full items-center justify-between gap-3 rounded-xl px-2 py-3 text-left transition enabled:hover:bg-surface-2 enabled:active:scale-[.99]">{content}</button> : <div className="flex min-h-20 items-center justify-between gap-3 px-2 py-3">{content}</div>}
        </li>;
      })}
    </ul>
    <div className="border-t border-border px-5 py-3">
      <div className="flex items-center justify-between gap-2 text-xs"><Link href="/settings" className="min-w-0 truncate py-2 text-muted">{settings.location_label || "Lokasi pilihan"} · {settings.timezone}</Link><span className="shrink-0 text-accent">{active ? "Waktunya Dhuha" : "Sesuai lokasi"}</span></div>
    </div>
  </section>;
}
