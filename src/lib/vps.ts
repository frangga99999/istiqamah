import { getState, subscribeStore } from "@/lib/store";

export const vpsConfigured = Boolean(process.env.NEXT_PUBLIC_VPS_API_URL);
const endpoint = process.env.NEXT_PUBLIC_VPS_API_URL ?? "";
export function vpsConnected() { try { return typeof window !== "undefined" && Boolean(localStorage.getItem("ps.vps-session")); } catch { return false; } }

export async function vpsRequest(path: string, body: unknown) {
  if (!vpsConfigured) throw new Error("Koneksi belum tersedia di versi ini. Muat ulang aplikasi untuk memperbarui.");
  let token: string | null;
  try { token = localStorage.getItem("ps.vps-session"); }
  catch { throw new Error("Penyimpanan browser tidak tersedia. Buka aplikasi di Safari atau Chrome biasa, lalu hubungkan akses pribadi."); }
  if (!token && path !== "/connect") throw new Error("Hubungkan akses pribadi untuk memakai AI.");
  let response: Response;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 55_000);
  try { response = await fetch(endpoint + path, { method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body), signal: controller.signal }); }
  catch { throw new Error("Koneksi terputus atau respons terlalu lama. Periksa internet, lalu coba kirim lagi."); }
  finally { clearTimeout(timer); }
  if (response.status === 401 && token) { localStorage.removeItem("ps.vps-session"); window.dispatchEvent(new Event("vps-status")); }
  if (!response.ok) throw new Error(response.status === 401 ? "Akses pribadi perlu dihubungkan kembali." : response.status === 429 ? "Batas permintaan tercapai. Coba lagi nanti." : "AI belum merespons. Catatan di perangkat tetap tersedia.");
  return response.json();
}

export function deviceId() {
  let id = localStorage.getItem("ps.vps-device");
  if (!id) { id = crypto.randomUUID(); localStorage.setItem("ps.vps-device", id); }
  return id;
}

export function localSnapshot() {
  const { profile, settings, prefs, goal, logs, monthlyIntentions, journalEntries, dailyReflections, fastingLogs } = getState();
  return { profile, settings, prefs, goal, logs, monthlyIntentions, journalEntries, dailyReflections, fastingLogs };
}

export async function backupNow() {
  const result = await vpsRequest("/backup", { device: deviceId(), snapshot: localSnapshot() });
  localStorage.setItem("ps.vps-last-backup", String(result.updated * 1000));
  window.dispatchEvent(new Event("vps-status"));
}

export async function connectVps(code: string) {
  const result = await vpsRequest("/connect", { code: code.trim() });
  if (typeof result.token !== "string") throw new Error("Sesi VPS tidak valid.");
  localStorage.setItem("ps.vps-session", result.token);
  window.dispatchEvent(new Event("vps-status"));
  // Backup retries independently; a failed upload must not invalidate sign-in.
  void backupNow().catch(() => window.dispatchEvent(new Event("vps-status")));
}

export async function disconnectVps() {
  await vpsRequest("/disconnect", {});
  localStorage.removeItem("ps.vps-session");
  window.dispatchEvent(new Event("vps-status"));
}

export function startVpsBackups() {
  let timer: ReturnType<typeof setTimeout>;
  let uploading = false;
  let dirty = false;
  async function run() {
    if (!vpsConnected() || !getState().hydrated || !getState().profile?.onboarded) return;
    if (uploading) { dirty = true; return; }
    uploading = true;
    try { await backupNow(); }
    catch { window.dispatchEvent(new Event("vps-status")); }
    finally { uploading = false; if (dirty) { dirty = false; schedule(); } }
  }
  function schedule() { clearTimeout(timer); timer = setTimeout(() => void run(), 2000); }
  const unsubscribe = subscribeStore(schedule);
  window.addEventListener("online", schedule);
  const retry = setInterval(schedule, 60_000);
  return () => { unsubscribe(); clearTimeout(timer); clearInterval(retry); window.removeEventListener("online", schedule); };
}
