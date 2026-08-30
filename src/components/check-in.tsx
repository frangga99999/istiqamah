"use client";
import { useEffect, useRef, useState } from "react";
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

          {time ? (
            <button
              onClick={() => setShowTime(true)}
              className="mx-auto flex items-center gap-1.5 text-sm text-muted hover:text-text"
            >
              Shalat pukul <span className="tabular font-medium text-text">{time}</span> · ubah
            </button>
          ) : (
            <button
              onClick={() => setShowTime(true)}
              className="mx-auto block text-xs text-subtle underline underline-offset-4 hover:text-muted"
            >
              Shalat pada waktu lain? Ubah waktu
            </button>
          )}

          <TimeDrawer
            open={showTime}
            onClose={() => setShowTime(false)}
            value={time ?? nowHHMM()}
            onConfirm={(v) => setTime(v)}
          />
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

function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function nowHHMM() {
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" }).format(new Date());
}

const ITEM_H = 40; // px per wheel row
const VISIBLE = 5; // rows shown → column height

// iOS-style time picker: scroll-snapping wheels that keep the selected number
// centred in the guide box, with a distance-based fade + scale for motion.
function TimeDrawer({
  open,
  onClose,
  value,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  value: string;
  onConfirm: (v: string) => void;
}) {
  const [hh, mm] = value.split(":").map(Number);
  const [h, setH] = useState(Number.isNaN(hh) ? 12 : hh);
  const [m, setM] = useState(Number.isNaN(mm) ? 0 : mm);
  return (
    <Sheet open={open} onClose={onClose} title="Waktu shalat">
      <div className="mb-1.5 flex gap-3 text-center text-xs text-subtle">
        <span className="flex-1">Jam</span>
        <span className="flex-1">Menit</span>
      </div>
      <div className="relative overflow-hidden rounded-2xl bg-surface-2">
        {/* centre selection guide + top/bottom fades */}
        <div
          className="pointer-events-none absolute inset-x-2 top-1/2 z-10 -translate-y-1/2 rounded-xl border border-accent/40 bg-accent/5"
          style={{ height: ITEM_H }}
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-14 bg-gradient-to-b from-surface-2 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-14 bg-gradient-to-t from-surface-2 to-transparent" />
        <div className="flex">
          <WheelCol count={24} value={h} onSelect={setH} />
          <WheelCol count={60} value={m} onSelect={setM} />
        </div>
      </div>
      <Button
        className="mt-4 w-full"
        onClick={() => {
          onConfirm(`${pad2(h)}:${pad2(m)}`);
          onClose();
        }}
      >
        Simpan waktu
      </Button>
    </Sheet>
  );
}

function WheelCol({
  count,
  value,
  onSelect,
}: {
  count: number;
  value: number;
  onSelect: (n: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const raf = useRef(0);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = value * ITEM_H; // centre initial value
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  function onScroll() {
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      const el = ref.current;
      if (!el) return;
      const idx = Math.max(0, Math.min(count - 1, Math.round(el.scrollTop / ITEM_H)));
      if (idx !== value) onSelect(idx);
    });
  }
  const pad = (ITEM_H * (VISIBLE - 1)) / 2;
  return (
    <div
      ref={ref}
      onScroll={onScroll}
      className="flex-1 snap-y snap-mandatory overflow-y-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      style={{ height: ITEM_H * VISIBLE }}
    >
      <div style={{ height: pad }} />
      {Array.from({ length: count }, (_, n) => {
        const dist = Math.abs(n - value);
        return (
          <button
            key={n}
            onClick={() => ref.current?.scrollTo({ top: n * ITEM_H, behavior: "smooth" })}
            className="flex w-full snap-center items-center justify-center"
            style={{ height: ITEM_H }}
          >
            <span
              className={cx(
                "tabular transition-all duration-150",
                n === value ? "scale-110 text-xl font-semibold text-accent" : "text-lg text-subtle",
              )}
              style={{ opacity: n === value ? 1 : Math.max(0.2, 1 - dist * 0.3) }}
            >
              {pad2(n)}
            </span>
          </button>
        );
      })}
      <div style={{ height: pad }} />
    </div>
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
