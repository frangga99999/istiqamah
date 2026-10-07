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
    <div className="flex items-start justify-between gap-3 px-5 pt-5">
      <div><h2 className="font-serif text-xl text-text">Ritme hari ini</h2><p className="mt-1 text-xs text-muted">Lima waktu, satu ruang untuk Dhuha.</p></div>
      <svg aria-hidden="true" viewBox="0 0 40 40" className="h-10 w-10 shrink-0 text-accent" fill="none" stroke="currentColor" strokeWidth="1.3"><path d="M3 30h34M10 27a10 10 0 0 1 20 0M20 5v6M4 15l4 4M36 15l-4 4" /><path d="M13 35h14" opacity=".4" /></svg>
    </div>
    <div className="grid grid-cols-3 gap-2 p-4">
      {cells.map((p) => {
        const isDhuha = p === "dhuha";
        const selected = isDhuha ? active : p === upcoming;
        return <div key={p} className={cx("min-w-0 rounded-xl border px-3 py-3.5 transition-colors duration-500", selected ? "border-accent/45 bg-accent-soft" : "border-transparent bg-surface-2/65")}>
          <p className={cx("text-xs", selected ? "font-medium text-accent" : "text-muted")}>{isDhuha ? "Dhuha" : PRAYER_LABEL[p]}</p>
          <p className="mt-2 tabular text-lg font-semibold tracking-tight text-text">{isDhuha ? dhuha ? formatTime(dhuha.start, settings.timezone) : "—" : formatTime(times.schedule.times[p], settings.timezone)}</p>
          <p className={cx("mt-1 text-[10px] leading-relaxed", selected ? "text-accent" : "text-muted")}>{isDhuha ? dhuha ? `s.d. ${formatTime(dhuha.end, settings.timezone)}` : "Tidak tersedia" : selected ? "Berikutnya" : "Waktu adzan"}</p>
        </div>;
      })}
    </div>
    <div className="border-t border-border px-5 py-3">
      <div className="flex items-center justify-between gap-2 text-xs"><Link href="/settings" className="min-w-0 truncate py-2 text-muted">{settings.location_label || "Lokasi pilihan"} · {settings.timezone}</Link><span className="shrink-0 text-accent">{active ? "Waktunya Dhuha" : "Sesuai lokasi"}</span></div>
      <details className="text-xs leading-relaxed text-muted"><summary className="cursor-pointer py-2">Tentang perkiraan Dhuha</summary><p className="pb-2">Rentang bantu: 20 menit setelah matahari terbit hingga 15 menit sebelum Dzuhur tanpa koreksi manual. Sesuaikan dengan jadwal masjid setempat. {dhuha && `Matahari terbit ${formatTime(dhuha.sunrise, settings.timezone)}.`} <a href="https://muhammadiyah.or.id/2020/08/tatacara-shalat-dhuha/" target="_blank" rel="noreferrer" className="underline">Rujukan waktu Dhuha</a></p></details>
    </div>
  </section>;
}
