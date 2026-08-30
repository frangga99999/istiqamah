"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { deleteAll, updatePrefs, updateSettings, useApp } from "@/lib/store";
import { CALC_METHODS } from "@/lib/prayer/times";
import { CITIES } from "@/lib/cities";
import { PRAYERS, PRAYER_LABEL, type PrayerName } from "@/lib/types";
import { Button, Card, Sheet, cx } from "@/components/ui";
import { IconBack, IconCheck, IconChevron } from "@/components/icons";
import { enableNotifications, notifyStatus } from "@/lib/notify";
import { getSupabase, supabaseConfigured } from "@/lib/supabase/client";

export default function SettingsPage() {
  const state = useApp();
  const router = useRouter();
  const [locOpen, setLocOpen] = useState(false);
  const [offsetsOpen, setOffsetsOpen] = useState(false);
  const [notif, setNotif] = useState(notifyStatus());

  if (!state.settings) {
    return (
      <div className="mx-auto max-w-md px-4 py-10 text-sm text-muted">
        Selesaikan onboarding dulu.
      </div>
    );
  }
  const s = state.settings;
  const p = state.prefs;

  function exportData() {
    const data = { profile: state.profile, settings: state.settings, prefs: state.prefs, goal: state.goal, logs: state.logs };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "istiqamah-data.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function removeAll() {
    if (confirm("Hapus semua data ibadah? Tindakan ini tidak dapat dibatalkan.")) {
      deleteAll();
      router.replace("/onboarding");
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <header className="sticky top-0 z-20 flex items-center gap-2 bg-bg/90 px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-3 backdrop-blur">
        <Link href="/today" aria-label="Kembali" className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-surface-2">
          <IconBack width={20} height={20} />
        </Link>
        <h1 className="text-lg font-semibold text-text">Pengaturan</h1>
      </header>

      <div className="space-y-8 px-4 pb-16">
        {/* Notifications (§106) */}
        <Group title="Pengingat">
          <RowButton
            label={notif === "granted" ? "Pengingat aktif di perangkat ini" : "Aktifkan pengingat"}
            hint={notif === "denied" ? "Izin ditolak — aktifkan lewat pengaturan browser." : undefined}
            value={notif === "granted" ? "Aktif" : ""}
            disabled={notif === "granted" || notif === "denied"}
            onClick={async () => setNotif(await enableNotifications())}
          />
          <SwitchRow
            label="Pengingat adaptif"
            hint="Menyesuaikan waktu pengingat dengan kebiasaanmu."
            on={p.adaptive_reminders}
            onChange={(v) => updatePrefs({ adaptive_reminders: v })}
          />
          {!p.adaptive_reminders && (
            <SelectRow
              label="Pengingat manual"
              value={String(p.manual_lead_minutes ?? 10)}
              options={[5, 10, 15, 20, 30].map((m) => ({ value: String(m), label: `${m} menit sebelum` }))}
              onChange={(v) => updatePrefs({ manual_lead_minutes: Number(v) })}
            />
          )}
          <SelectRow
            label="Maksimal pengingat"
            value={String(p.max_reminders)}
            options={[1, 2, 3].map((m) => ({ value: String(m), label: `${m}×` }))}
            onChange={(v) => updatePrefs({ max_reminders: Number(v) })}
          />
          <SwitchRow label="Suara" on={p.sound} onChange={(v) => updatePrefs({ sound: v })} />
          <SwitchRow label="Getar" on={p.vibration} onChange={(v) => updatePrefs({ vibration: v })} />
        </Group>

        {/* Prayer settings (§69) */}
        <Group title="Waktu Shalat">
          <RowButton label="Lokasi" value={s.location_label ?? "—"} onClick={() => setLocOpen(true)} />
          <SelectRow
            label="Metode perhitungan"
            value={s.calculation_method}
            options={Object.entries(CALC_METHODS).map(([k, v]) => ({ value: k, label: v.label }))}
            onChange={(v) => updateSettings({ calculation_method: v })}
          />
          <SelectRow
            label="Metode Ashar"
            value={s.asr_method}
            options={[
              { value: "standard", label: "Standar (Syafi'i)" },
              { value: "hanafi", label: "Hanafi" },
            ]}
            onChange={(v) => updateSettings({ asr_method: v as "standard" | "hanafi" })}
          />
          <RowButton
            label="Penyesuaian waktu"
            value={offsetsOpen ? "" : "menit"}
            onClick={() => setOffsetsOpen((v) => !v)}
          />
          {offsetsOpen && (
            <div className="space-y-2 bg-surface-2/40 px-3 pb-4 pt-3">
              <p className="px-1 pb-0.5 text-xs text-subtle">Geser waktu tiap shalat (menit)</p>
              {PRAYERS.map((prayer) => (
                <OffsetRow
                  key={prayer}
                  prayer={prayer}
                  value={s.offsets[prayer]}
                  onChange={(val) => updateSettings({ offsets: { ...s.offsets, [prayer]: val } })}
                />
              ))}
            </div>
          )}
        </Group>

        {/* Goals (§67) */}
        <Group title="Target">
          <SwitchRow
            label="Prioritas masjid"
            hint="Arahkan kebiasaan menuju jamaah di masjid."
            on={p.mosque_priority}
            onChange={(v) => updatePrefs({ mosque_priority: v })}
          />
          <SwitchRow
            label="Catat sunnah"
            on={p.sunnah_tracking}
            onChange={(v) => updatePrefs({ sunnah_tracking: v })}
          />
        </Group>

        <AccountSection />

        {/* Privacy (§91–92) */}
        <Group title="Privasi">
          <RowButton label="Ekspor data" value="" onClick={exportData} />
          <button
            onClick={removeAll}
            className="flex w-full items-center justify-between px-4 py-3.5 text-left text-[15px] text-danger hover:bg-surface-2"
          >
            Hapus semua data
          </button>
        </Group>

        <p className="px-1 text-center text-xs text-subtle">
          Data ibadahmu bersifat pribadi dan tersimpan di perangkat ini.
        </p>
      </div>

      <LocationSheet open={locOpen} onClose={() => setLocOpen(false)} />
    </div>
  );
}

function AccountSection() {
  const [email, setEmail] = useState<string | null>(null);
  useEffect(() => {
    if (!supabaseConfigured()) return;
    const sb = getSupabase();
    if (!sb) return;
    sb.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => setEmail(s?.user?.email ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!supabaseConfigured()) return null;
  return (
    <Group title="Akun">
      {email ? (
        <>
          <div className="px-4 py-3.5">
            <p className="text-xs text-subtle">Masuk sebagai</p>
            <p className="text-[15px] text-text">{email}</p>
          </div>
          <button
            onClick={() => getSupabase()?.auth.signOut()}
            className="w-full px-4 py-3.5 text-left text-[15px] text-muted hover:bg-surface-2"
          >
            Keluar
          </button>
        </>
      ) : (
        <Link href="/login" className="flex items-center justify-between px-4 py-3.5 hover:bg-surface-2">
          <span className="text-[15px] text-text">Masuk untuk sinkronisasi</span>
          <IconChevron width={16} height={16} className="text-subtle" />
        </Link>
      )}
    </Group>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 px-1 text-xs font-medium uppercase tracking-wide text-subtle">{title}</h2>
      <Card className="divide-y divide-border overflow-hidden">{children}</Card>
    </section>
  );
}

function SwitchRow({
  label,
  hint,
  on,
  onChange,
}: {
  label: string;
  hint?: string;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3.5">
      <div className="min-w-0">
        <p className="text-[15px] text-text">{label}</p>
        {hint && <p className="mt-0.5 text-xs text-subtle">{hint}</p>}
      </div>
      <Switch on={on} onChange={onChange} label={label} />
    </div>
  );
}

// Toggle: knob is an in-flow flex child positioned by padding + a bounded slide.
// No absolute/border-box math, so it can never overlap the track edge.
export function Switch({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={cx(
        "inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors duration-200",
        on ? "bg-accent" : "bg-border-strong",
      )}
    >
      <span
        className={cx(
          "h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200",
          on ? "translate-x-5" : "translate-x-0",
        )}
      />
    </button>
  );
}

// iOS Settings-style picker: the row shows the current value; tapping it opens a
// bottom-sheet drawer with the options as a checkmark list (no native <select>).
function SelectRow({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value)?.label ?? value;
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-surface-2"
      >
        <span className="shrink-0 text-[15px] text-text">{label}</span>
        <span className="flex min-w-0 items-center gap-1.5 text-sm text-subtle">
          <span className="truncate">{current}</span>
          <IconChevron width={16} height={16} className="shrink-0" />
        </span>
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={label}>
        <div className="space-y-1">
          {options.map((o) => (
            <button
              key={o.value}
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
              className={cx(
                "flex w-full items-center justify-between rounded-xl px-4 py-3.5 text-left text-[15px] transition-colors",
                o.value === value ? "bg-accent-soft text-accent" : "text-text hover:bg-surface-2",
              )}
            >
              {o.label}
              {o.value === value && <IconCheck width={18} height={18} strokeWidth={2.5} />}
            </button>
          ))}
        </div>
      </Sheet>
    </>
  );
}

function RowButton({
  label,
  value,
  hint,
  onClick,
  disabled,
}: {
  label: string;
  value: string;
  hint?: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cx(
        "flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left",
        disabled ? "cursor-default" : "hover:bg-surface-2",
      )}
    >
      <span>
        <span className="block text-[15px] text-text">{label}</span>
        {hint && <span className="mt-0.5 block text-xs text-subtle">{hint}</span>}
      </span>
      <span className="flex items-center gap-1.5 text-sm text-subtle">
        {value}
        {!disabled && <IconChevron width={16} height={16} />}
      </span>
    </button>
  );
}

function OffsetRow({
  prayer,
  value,
  onChange,
}: {
  prayer: PrayerName;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-surface px-4 py-2.5">
      <span className="text-[15px] text-text">{PRAYER_LABEL[prayer]}</span>
      <div className="flex items-center gap-3">
        <Stepper onClick={() => onChange(value - 1)}>−</Stepper>
        <span className="tabular w-10 text-center text-sm font-medium text-text">
          {value > 0 ? `+${value}` : value}
        </span>
        <Stepper onClick={() => onChange(value + 1)}>+</Stepper>
      </div>
    </div>
  );
}

function Stepper({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="grid h-8 w-8 place-items-center rounded-full bg-surface-2 text-lg text-muted transition-colors hover:bg-border hover:text-text active:scale-95"
    >
      {children}
    </button>
  );
}

function LocationSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  function useDevice() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      updateSettings({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Jakarta",
        location_label: "Lokasi saya",
      });
      onClose();
    });
  }
  return (
    <Sheet open={open} onClose={onClose} title="Pilih lokasi">
      <div className="space-y-3">
        <Button variant="secondary" className="w-full" onClick={useDevice}>
          Gunakan lokasi saya
        </Button>
        <div className="grid grid-cols-2 gap-2">
          {CITIES.map((c) => (
            <button
              key={c.label}
              onClick={() => {
                updateSettings({ latitude: c.lat, longitude: c.lng, timezone: c.tz, location_label: c.label });
                onClose();
              }}
              className="rounded-xl border border-border bg-surface px-4 py-3 text-left text-[15px] text-text hover:border-border-strong"
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>
    </Sheet>
  );
}
