"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { completeOnboarding, useApp } from "@/lib/store";
import { startingStrategy } from "@/lib/focus";
import { DEFAULT_SETTINGS } from "@/lib/prayer/times";
import type {
  ActivityType,
  MosqueFrequency,
  PrayerSettings,
  StartingCondition,
  SunnahFrequency,
  UserProfile,
} from "@/lib/types";
import { Button, cx } from "@/components/ui";
import { IconChevron } from "@/components/icons";
import { CITIES } from "@/lib/cities";
import { asset } from "@/lib/base-path";

type Opt<T> = { value: T; label: string };
const CONDITION: Opt<StartingCondition>[] = [
  { value: "often_missed", label: "Sering ada yang terlewat" },
  { value: "often_late", label: "Selalu shalat, tetapi sering terlambat" },
  { value: "mostly_ontime", label: "Cukup tepat waktu" },
  { value: "consistent", label: "Sudah cukup konsisten" },
];
const MOSQUE: Opt<MosqueFrequency>[] = [
  { value: "never", label: "Belum terbiasa" },
  { value: "sometimes", label: "Kadang-kadang" },
  { value: "often", label: "Cukup sering" },
  { value: "almost_always", label: "Hampir selalu" },
];
const SUNNAH: Opt<SunnahFrequency>[] = [
  { value: "never", label: "Belum terbiasa" },
  { value: "sometimes", label: "Kadang-kadang" },
  { value: "routine", label: "Sudah cukup rutin" },
];
const ACTIVITY: Opt<ActivityType>[] = [
  { value: "work", label: "Kerja" },
  { value: "college", label: "Kuliah" },
  { value: "school", label: "Sekolah" },
  { value: "flexible", label: "Fleksibel" },
  { value: "other", label: "Lainnya" },
];

const STEPS = ["intro", "condition", "mosque", "sunnah", "activity", "location"] as const;

export default function Onboarding() {
  const { hydrated, profile } = useApp();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [a, setA] = useState<Partial<UserProfile>>({});
  const [loc, setLoc] = useState<{ lat: number; lng: number; tz: string; label: string } | null>(null);
  const [locating, setLocating] = useState(false);

  // Already onboarded → straight to app.
  useEffect(() => {
    if (hydrated && profile?.onboarded) router.replace("/today");
  }, [hydrated, profile, router]);

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  function choose<K extends keyof UserProfile>(key: K, value: UserProfile[K]) {
    setA((prev) => ({ ...prev, [key]: value }));
    next();
  }

  function useDeviceLocation() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Jakarta";
        setLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude, tz, label: "Lokasi saya" });
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }

  function finish() {
    if (!loc) return;
    const prof: UserProfile = {
      starting_condition: a.starting_condition ?? "often_late",
      mosque_frequency: a.mosque_frequency ?? "sometimes",
      sunnah_frequency: a.sunnah_frequency ?? "never",
      activity_type: a.activity_type ?? "flexible",
    };
    const settings: PrayerSettings = {
      latitude: loc.lat,
      longitude: loc.lng,
      timezone: loc.tz,
      location_label: loc.label,
      ...DEFAULT_SETTINGS,
      offsets: { ...DEFAULT_SETTINGS.offsets },
    };
    const strat = startingStrategy(prof);
    completeOnboarding(prof, settings, strat.prefsPatch, strat.goal);
    router.replace("/today");
  }

  const name = STEPS[step];

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-6 pb-8 pt-[calc(env(safe-area-inset-top)+2rem)]">
      {/* progress dots */}
      {step > 0 && (
        <div className="mb-8 flex items-center gap-2">
          <button onClick={back} aria-label="Kembali" className="mr-1 text-muted">
            <IconChevron width={20} height={20} className="rotate-180" />
          </button>
          {STEPS.slice(1).map((_, i) => (
            <span
              key={i}
              className={cx(
                "h-1 flex-1 rounded-full transition-colors",
                i < step ? "bg-accent" : "bg-surface-2",
              )}
            />
          ))}
        </div>
      )}

      {name === "intro" && (
        <div className="flex flex-1 flex-col justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={asset("/icon.svg")} alt="" className="mb-8 h-16 w-16 rounded-2xl" />
          <h1 className="text-3xl font-semibold leading-tight tracking-tight text-text">
            Bangun kebiasaan shalat, perlahan.
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-muted">
            Aplikasi akan mempelajari pola shalatmu dan membantu mengingatkan pada waktu yang
            paling tepat.
          </p>
          <Button className="mt-10 w-full" onClick={next}>
            Mulai
          </Button>
        </div>
      )}

      {name === "condition" && (
        <Question title="Bagaimana kondisi shalatmu sekarang?">
          {CONDITION.map((o) => (
            <Choice key={o.value} onClick={() => choose("starting_condition", o.value)}>
              {o.label}
            </Choice>
          ))}
        </Question>
      )}
      {name === "mosque" && (
        <Question title="Seberapa sering berjamaah di masjid?">
          {MOSQUE.map((o) => (
            <Choice key={o.value} onClick={() => choose("mosque_frequency", o.value)}>
              {o.label}
            </Choice>
          ))}
        </Question>
      )}
      {name === "sunnah" && (
        <Question title="Bagaimana dengan shalat sunnah?">
          {SUNNAH.map((o) => (
            <Choice key={o.value} onClick={() => choose("sunnah_frequency", o.value)}>
              {o.label}
            </Choice>
          ))}
        </Question>
      )}
      {name === "activity" && (
        <Question title="Aktivitas utamamu?">
          {ACTIVITY.map((o) => (
            <Choice key={o.value} onClick={() => choose("activity_type", o.value)}>
              {o.label}
            </Choice>
          ))}
        </Question>
      )}

      {name === "location" && (
        <Question title="Di mana lokasimu?" subtitle="Untuk menghitung waktu shalat yang akurat.">
          <Button
            variant="secondary"
            className="w-full"
            onClick={useDeviceLocation}
            disabled={locating}
          >
            {locating ? "Mencari lokasi…" : "Gunakan lokasi saya"}
          </Button>
          <div className="py-1 text-center text-xs text-subtle">atau pilih kota</div>
          <div className="grid grid-cols-2 gap-2">
            {CITIES.map((c) => (
              <Choice
                key={c.label}
                selected={loc?.label === c.label}
                onClick={() => setLoc({ lat: c.lat, lng: c.lng, tz: c.tz, label: c.label })}
              >
                {c.label}
              </Choice>
            ))}
          </div>
          <Button className="mt-4 w-full" onClick={finish} disabled={!loc}>
            {loc ? `Selesai · ${loc.label}` : "Pilih lokasi dulu"}
          </Button>
        </Question>
      )}
    </div>
  );
}

function Question({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col">
      <h1 className="text-2xl font-semibold leading-snug tracking-tight text-text">{title}</h1>
      {subtitle && <p className="mt-2 text-sm text-muted">{subtitle}</p>}
      <div className="mt-7 space-y-2.5">{children}</div>
    </div>
  );
}

function Choice({
  children,
  onClick,
  selected,
}: {
  children: React.ReactNode;
  onClick: () => void;
  selected?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cx(
        "flex min-h-13 w-full items-center rounded-xl border px-4 py-3.5 text-left text-[15px] transition active:scale-[0.99]",
        selected
          ? "border-accent bg-accent-soft text-accent"
          : "border-border bg-surface text-text hover:border-border-strong hover:bg-surface-2",
      )}
    >
      {children}
    </button>
  );
}
