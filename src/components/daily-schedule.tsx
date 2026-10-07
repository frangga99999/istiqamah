"use client";
import { useMemo } from "react";
import Link from "next/link";
import { dhuhaWindow, formatTime, scheduleForDay } from "@/lib/prayer/times";
import { PRAYERS, PRAYER_LABEL, type PrayerSettings } from "@/lib/types";
import { cx } from "@/components/ui";

export function DailySchedule({ settings, now, date }: { settings: PrayerSettings; now: Date; date: string }) {
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
  return <section aria-label="Jadwal shalat hari ini" className="overflow-hidden rounded-2xl border border-border bg-surface">
    <h2 className="px-5 pt-5 pb-3 text-base font-semibold">Jadwal shalat</h2>
    <ul className="divide-y divide-border px-5">
      {cells.map((p) => {
        const isDhuha = p === "dhuha";
        const selected = isDhuha ? active : p === upcoming;
        return <li key={p} className={cx("flex min-h-14 items-center justify-between gap-3 py-3 transition-colors", selected ? "text-accent" : "text-text")}>
          <div className="flex flex-wrap items-center gap-2"><span className="text-sm font-medium">{isDhuha ? "Dhuha" : PRAYER_LABEL[p]}</span>{selected && <span className="rounded-full bg-accent-soft px-2 py-1 text-[10px]">{isDhuha ? "Sedang berlangsung" : "Berikutnya"}</span>}</div>
          <span className="shrink-0 tabular text-sm font-semibold">{isDhuha ? dhuha ? `${formatTime(dhuha.start, settings.timezone)}–${formatTime(dhuha.end, settings.timezone)}` : "Tidak tersedia" : formatTime(times.schedule.times[p], settings.timezone)}</span>
        </li>;
      })}
    </ul>
    <div className="border-t border-border px-5 py-3">
      <div className="flex items-center justify-between gap-2 text-xs"><Link href="/settings" className="min-w-0 truncate py-2 text-muted">{settings.location_label || "Lokasi pilihan"} · {settings.timezone}</Link><span className="shrink-0 text-accent">{active ? "Waktunya Dhuha" : "Sesuai lokasi"}</span></div>
    </div>
  </section>;
}
