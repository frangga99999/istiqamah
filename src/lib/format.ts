// Small shared formatters (Indonesian locale).
export function humanCountdown(min: number): string {
  if (min <= 0) return "sebentar lagi";
  if (min < 60) return `${min} menit lagi`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} jam ${m} menit lagi` : `${h} jam lagi`;
}

export function longDate(d: Date, tz: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: tz,
  }).format(d);
}

export function shortDate(d: Date, tz: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: tz,
  }).format(d);
}
