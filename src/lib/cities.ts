// Preset locations for manual selection (PRD §17). Covers Indonesia's timezones.
export interface City {
  label: string;
  lat: number;
  lng: number;
  tz: string;
}

export const CITIES: City[] = [
  { label: "Jakarta", lat: -6.2088, lng: 106.8456, tz: "Asia/Jakarta" },
  { label: "Bandung", lat: -6.9147, lng: 107.6098, tz: "Asia/Jakarta" },
  { label: "Surabaya", lat: -7.2575, lng: 112.7521, tz: "Asia/Jakarta" },
  { label: "Medan", lat: 3.5952, lng: 98.6722, tz: "Asia/Jakarta" },
  { label: "Yogyakarta", lat: -7.7956, lng: 110.3695, tz: "Asia/Jakarta" },
  { label: "Makassar", lat: -5.1477, lng: 119.4327, tz: "Asia/Makassar" },
  { label: "Denpasar", lat: -8.6705, lng: 115.2126, tz: "Asia/Makassar" },
  { label: "Balikpapan", lat: -1.2379, lng: 116.8529, tz: "Asia/Makassar" },
  { label: "Jayapura", lat: -2.5337, lng: 140.7181, tz: "Asia/Jayapura" },
];
