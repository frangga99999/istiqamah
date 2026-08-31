"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useApp } from "@/lib/store";
import { fetchNearbyMosques, formatDistance, mapsUrl, type Mosque } from "@/lib/mosques";
import { Button, Card, cx } from "@/components/ui";
import { IconMosque, IconPin } from "@/components/icons";

type Center = { lat: number; lon: number; label: string };

export default function MasjidPage() {
  const state = useApp();
  const [center, setCenter] = useState<Center | null>(null);
  const [mosques, setMosques] = useState<Mosque[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const didInit = useRef(false);

  const search = useCallback(async (lat: number, lon: number, label: string) => {
    abort.current?.abort();
    const ctrl = new AbortController();
    abort.current = ctrl;
    setCenter({ lat, lon, label });
    setLoading(true);
    setError(null);
    try {
      let list = await fetchNearbyMosques(lat, lon, 3000, ctrl.signal);
      if (list.length === 0) list = await fetchNearbyMosques(lat, lon, 10000, ctrl.signal);
      setMosques(list.slice(0, 30));
    } catch (e) {
      if ((e as Error).name !== "AbortError") setError("Gagal memuat data. Periksa koneksi lalu coba lagi.");
    } finally {
      setLoading(false);
    }
  }, []);

  // First load: search once around the location from onboarding/settings.
  // (No unmount-abort — StrictMode's double-mount would cancel this initial fetch;
  //  search() already aborts a superseded request when a new one starts.)
  useEffect(() => {
    if (didInit.current || !state.settings) return;
    didInit.current = true;
    search(state.settings.latitude, state.settings.longitude, state.settings.location_label ?? "lokasimu");
  }, [state.settings, search]);

  function useMyLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        search(pos.coords.latitude, pos.coords.longitude, "lokasimu saat ini");
      },
      () => {
        setLocating(false);
        setError("Tidak bisa mengakses lokasi. Aktifkan izin lokasi di perangkatmu.");
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  const nearest = mosques?.[0];
  const rest = mosques?.slice(1) ?? [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-text">Masjid Terdekat</h1>
        <p className="mt-1 text-sm text-muted">
          {center ? `Di sekitar ${center.label}` : "Menemukan tempat shalat di dekatmu"}
        </p>
      </div>

      <Button variant="secondary" className="w-full" onClick={useMyLocation} disabled={locating || loading}>
        <IconMosque width={18} height={18} />
        {locating ? "Mencari lokasimu…" : "Gunakan lokasi saya sekarang"}
      </Button>

      {loading && <SkeletonList />}

      {error && !loading && (
        <Card className="p-4">
          <p className="text-sm text-muted">{error}</p>
          {center && (
            <Button
              variant="ghost"
              className="mt-2 px-0"
              onClick={() => search(center.lat, center.lon, center.label)}
            >
              Coba lagi
            </Button>
          )}
        </Card>
      )}

      {!loading && !error && mosques && mosques.length === 0 && (
        <Card className="p-5 text-center">
          <p className="text-sm text-muted">
            Belum ada masjid yang tercatat di sekitar sini. Coba gunakan lokasi lain.
          </p>
        </Card>
      )}

      {!loading && nearest && (
        <section className="space-y-3">
          <p className="px-1 text-xs font-medium uppercase tracking-wide text-subtle">Rekomendasi terdekat</p>
          <MosqueCard mosque={nearest} highlight />
        </section>
      )}

      {!loading && rest.length > 0 && (
        <section className="space-y-2.5">
          <p className="px-1 text-xs font-medium uppercase tracking-wide text-subtle">Lainnya di dekatmu</p>
          {rest.map((m) => (
            <MosqueCard key={m.id} mosque={m} />
          ))}
        </section>
      )}

      <p className="px-1 pt-1 text-center text-xs text-subtle">Data lokasi dari OpenStreetMap</p>
    </div>
  );
}

// The whole card is a link: tapping it opens the mosque in Google Maps / the
// device's map app (where directions are one tap away).
function MosqueCard({ mosque, highlight }: { mosque: Mosque; highlight?: boolean }) {
  return (
    <a
      href={mapsUrl(mosque)}
      target="_blank"
      rel="noopener noreferrer"
      className={cx(
        "flex items-center gap-3.5 rounded-2xl border p-4 transition active:scale-[0.99]",
        highlight
          ? "border-mosque/40 bg-mosque-soft"
          : "border-border bg-surface hover:border-border-strong hover:bg-surface-2",
      )}
    >
      <span
        className={cx(
          "grid h-11 w-11 shrink-0 place-items-center rounded-full",
          highlight ? "bg-mosque text-white" : "bg-surface-2 text-mosque",
        )}
      >
        <IconMosque width={22} height={22} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-medium text-text">{mosque.name}</p>
        <p className="mt-0.5 text-sm text-muted">
          {mosque.kind === "mushalla" ? "Mushalla" : "Masjid"} · {formatDistance(mosque.distanceM)}
        </p>
      </div>
      <span className="flex shrink-0 items-center gap-1 rounded-full bg-surface-2 px-3 py-2 text-sm font-medium text-accent">
        <IconPin width={15} height={15} />
        Buka
      </span>
    </a>
  );
}

function SkeletonList() {
  return (
    <div className="space-y-2.5">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3.5 rounded-2xl border border-border bg-surface p-4">
          <span className="h-11 w-11 shrink-0 animate-pulse rounded-full bg-surface-2" />
          <div className="flex-1 space-y-2">
            <span className="block h-3.5 w-2/3 animate-pulse rounded bg-surface-2" />
            <span className="block h-3 w-1/3 animate-pulse rounded bg-surface-2" />
          </div>
        </div>
      ))}
    </div>
  );
}
