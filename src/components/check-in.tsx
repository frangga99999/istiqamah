"use client";
import { useState } from "react";
import type { PerformedLocation, PrayerName } from "@/lib/types";
import { PRAYER_LABEL } from "@/lib/types";
import { useApp, upsertLog } from "@/lib/store";
import { Button, Sheet, cx } from "@/components/ui";
import { IconCheck, IconMosque, IconPerson, IconUsers } from "@/components/icons";

const LOCATIONS: { key: PerformedLocation; label: string; Icon: typeof IconMosque; accent: boolean }[] = [
  { key: "mosque", label: "Masjid", Icon: IconMosque, accent: true },
  { key: "congregation", label: "Berjamaah", Icon: IconUsers, accent: false },
  { key: "alone", label: "Sendiri", Icon: IconPerson, accent: false },
];

export function CheckIn({
  open,
  onClose,
  prayer,
  date,
  prayerStartISO,
}: {
  open: boolean;
  onClose: () => void;
  prayer: PrayerName;
  date: string;
  prayerStartISO: string;
}) {
  const { prefs } = useApp();
  const [step, setStep] = useState<"location" | "sunnah">("location");
  const [location, setLocation] = useState<PerformedLocation | null>(null);
  const [time, setTime] = useState<string | null>(null); // "HH:MM" if corrected
  const [before, setBefore] = useState(false);
  const [after, setAfter] = useState(false);
  const [showTime, setShowTime] = useState(false);

  function reset() {
    setStep("location");
    setLocation(null);
    setTime(null);
    setBefore(false);
    setAfter(false);
    setShowTime(false);
  }
  function close() {
    reset();
    onClose();
  }

  function performedAtISO(): string {
    if (!time) return new Date().toISOString();
    // User-corrected time on this calendar day (device tz ≈ user tz for check-in).
    const d = new Date(`${date}T${time}:00`);
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  }

  function save(loc: PerformedLocation, finish: boolean) {
    upsertLog({
      date,
      prayer,
      prayer_start_at: prayerStartISO,
      performed_at: performedAtISO(),
      performed_location: loc,
      congregational: loc !== "alone",
      sunnah_before: before,
      sunnah_after: after,
      manual_time: time != null,
    });
    if (finish) close();
  }

  function pickLocation(loc: PerformedLocation) {
    setLocation(loc);
    if (prefs.sunnah_tracking) {
      save(loc, false); // record now; sunnah is an optional add-on
      setStep("sunnah");
    } else {
      save(loc, true);
    }
  }

  return (
    <Sheet open={open} onClose={close} title={step === "location" ? "Sudah shalat?" : "Sunnah?"}>
      {step === "location" ? (
        <div className="space-y-4">
          <p className="-mt-2 text-center text-sm text-muted">{PRAYER_LABEL[prayer]}</p>
          <div className="grid grid-cols-3 gap-2.5">
            {LOCATIONS.map(({ key, label, Icon, accent }) => (
              <button
                key={key}
                onClick={() => pickLocation(key)}
                className={cx(
                  "flex flex-col items-center gap-2 rounded-2xl border px-2 py-4 transition active:scale-[0.98]",
                  accent
                    ? "border-mosque/40 bg-mosque-soft text-mosque hover:border-mosque"
                    : "border-border bg-surface-2 text-text hover:border-border-strong",
                )}
              >
                <Icon width={26} height={26} />
                <span className="text-[13px] font-medium">{label}</span>
              </button>
            ))}
          </div>

          {showTime ? (
            <label className="flex items-center justify-between rounded-xl bg-surface-2 px-4 py-3 text-sm">
              <span className="text-muted">Waktu shalat</span>
              <input
                type="time"
                defaultValue={new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" }).format(new Date())}
                onChange={(e) => setTime(e.target.value)}
                className="bg-transparent text-text tabular focus:outline-none"
              />
            </label>
          ) : (
            <button
              onClick={() => setShowTime(true)}
              className="mx-auto block text-xs text-subtle underline underline-offset-4 hover:text-muted"
            >
              Shalat pada waktu lain? Ubah waktu
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2.5">
            <Toggle label="Sunnah sebelum" on={before} onClick={() => setBefore((v) => !v)} />
            <Toggle label="Sunnah sesudah" on={after} onClick={() => setAfter((v) => !v)} />
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={close}>
              Lewati
            </Button>
            <Button
              className="flex-1"
              onClick={() => location && save(location, true)}
            >
              Selesai
            </Button>
          </div>
        </div>
      )}
    </Sheet>
  );
}

function Toggle({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      className={cx(
        "flex items-center justify-between rounded-xl border px-4 py-3.5 text-sm font-medium transition",
        on
          ? "border-accent bg-accent-soft text-accent"
          : "border-border bg-surface-2 text-muted hover:border-border-strong",
      )}
    >
      {label}
      <span
        className={cx(
          "grid h-5 w-5 place-items-center rounded-full border",
          on ? "border-accent bg-accent text-accent-fg" : "border-border-strong",
        )}
      >
        {on && <IconCheck width={13} height={13} strokeWidth={2.5} />}
      </span>
    </button>
  );
}
