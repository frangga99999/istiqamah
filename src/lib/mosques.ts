// Nearby mosque/mushalla lookup via the free OpenStreetMap Overpass API
// (no API key, CORS-enabled). PRD §125 "Mosque Intelligence".
export interface Mosque {
  id: string;
  name: string;
  lat: number;
  lon: number;
  distanceM: number;
  kind: "masjid" | "mushalla";
}

const ENDPOINT = "https://overpass-api.de/api/interpreter";

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6_371_000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// OSM doesn't cleanly separate the two; infer a mushalla (small prayer room) from
// common Indonesian naming, else treat as a masjid.
function kindFromName(name: string): "masjid" | "mushalla" {
  return /mushol|mushal|musala|langgar|surau/i.test(name) ? "mushalla" : "masjid";
}

export async function fetchNearbyMosques(
  lat: number,
  lon: number,
  radiusM = 3000,
  signal?: AbortSignal,
): Promise<Mosque[]> {
  const q = `[out:json][timeout:25];(node["amenity"="place_of_worship"]["religion"="muslim"](around:${radiusM},${lat},${lon});way["amenity"="place_of_worship"]["religion"="muslim"](around:${radiusM},${lat},${lon}););out center tags;`;
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "data=" + encodeURIComponent(q),
    signal,
  });
  if (!res.ok) throw new Error(`overpass ${res.status}`);
  const data = (await res.json()) as { elements?: Array<Record<string, unknown>> };

  const seen = new Set<string>();
  const out: Mosque[] = [];
  for (const el of data.elements ?? []) {
    const tags = (el.tags ?? {}) as Record<string, string>;
    const elat = (el.lat as number) ?? (el.center as { lat: number })?.lat;
    const elon = (el.lon as number) ?? (el.center as { lon: number })?.lon;
    if (elat == null || elon == null) continue;
    const name = (tags.name ?? "").trim() || "Tempat shalat";
    const key = `${name}:${elat.toFixed(4)}:${elon.toFixed(4)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      id: String(el.id),
      name,
      lat: elat,
      lon: elon,
      distanceM: Math.round(haversine(lat, lon, elat, elon)),
      kind: kindFromName(name),
    });
  }
  return out.sort((a, b) => a.distanceM - b.distanceM);
}

export function formatDistance(m: number): string {
  return m < 1000 ? `${m} m` : `${(m / 1000).toFixed(1)} km`;
}

// Universal Google Maps link — opens the mosque's location in the Maps app where
// installed (Android/iOS), or Maps web otherwise. From there directions are one tap.
export function mapsUrl(m: Mosque): string {
  const q = encodeURIComponent(`${m.name} ${m.lat},${m.lon}`);
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}
