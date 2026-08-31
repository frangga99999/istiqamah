// Short, well-known verses and hadith about prayer — a subtle "sweetener" on Home.
export interface Quote {
  text: string;
  source: string;
}

export const QUOTES: Quote[] = [
  { text: "Sesungguhnya shalat itu mencegah dari perbuatan keji dan mungkar.", source: "QS. Al-'Ankabut: 45" },
  { text: "Dan dirikanlah shalat untuk mengingat Aku.", source: "QS. Taha: 14" },
  { text: "Jadikanlah sabar dan shalat sebagai penolongmu.", source: "QS. Al-Baqarah: 45" },
  { text: "Peliharalah semua shalatmu, dan peliharalah shalat wustha.", source: "QS. Al-Baqarah: 238" },
  { text: "Amal yang pertama kali dihisab pada hari kiamat adalah shalat.", source: "HR. Tirmidzi" },
  {
    text: "Perumpamaan shalat lima waktu bagai sungai yang mengalir; siapa mandi di dalamnya lima kali sehari, tak tersisa kotoran padanya.",
    source: "HR. Muslim",
  },
];

// Stable pick for a given day key (YYYY-MM-DD) — rotates daily.
export function quoteOfDay(dateKey: string): Quote {
  let h = 0;
  for (let i = 0; i < dateKey.length; i++) h = (h * 31 + dateKey.charCodeAt(i)) >>> 0;
  return QUOTES[h % QUOTES.length];
}
