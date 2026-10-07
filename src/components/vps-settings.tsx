"use client";
import { useEffect, useState } from "react";
import { backupNow, connectVps, disconnectVps, deviceId, vpsConfigured, vpsConnected, vpsRequest } from "@/lib/vps";
import { Button, Card } from "@/components/ui";
import { restoreSnapshot } from "@/lib/store";

export function VPSSettings() {
  const [connected, setConnected] = useState(false);
  const [last, setLast] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [backups, setBackups] = useState<{ device: string; updated: number }[]>([]);
  const [restoreDevice, setRestoreDevice] = useState("");
  useEffect(() => {
    const refresh = () => { setConnected(vpsConnected()); const stamp = localStorage.getItem("ps.vps-last-backup"); setLast(stamp ? new Date(Number(stamp)).toLocaleString("id-ID") : ""); };
    refresh(); window.addEventListener("vps-status", refresh);
    return () => window.removeEventListener("vps-status", refresh);
  }, []);
  useEffect(() => {
    if (!connected) return;
    void vpsRequest("/backups", {}).then((result) => {
      if (Array.isArray(result.backups)) setBackups(result.backups);
    }).catch(() => { /* Manual backup still reports failures. */ });
  }, [connected, last]);
  if (!vpsConfigured) return null;
  async function action(run: () => Promise<unknown>, success: string) {
    setBusy(true); setMessage("");
    try { await run(); setMessage(success); setCode(""); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Belum berhasil. Coba lagi."); }
    finally { setBusy(false); }
  }
  return <Card className="space-y-4 p-5"><div><p className="text-xs uppercase tracking-widest text-accent">Ruang pribadi</p><h2 className="mt-2 font-serif text-xl">Catatan aman di VPS-mu</h2><p className="mt-2 text-sm leading-relaxed text-muted">{connected ? "Terhubung. Catatan perangkat ini dicadangkan otomatis dan AI VPS Combo gue siap digunakan." : "Masukkan kode akses pribadi untuk mengaktifkan AI dan cadangan catatan di VPS."}</p></div>
    {!connected ? <form onSubmit={(event) => { event.preventDefault(); void action(() => connectVps(code), "VPS terhubung dan cadangan tersimpan."); }} className="space-y-3"><label className="block text-sm text-muted">Kode akses VPS<input type="password" autoComplete="off" value={code} onChange={(event) => setCode(event.target.value)} className="mt-2 w-full rounded-xl border border-border bg-surface-2 p-3" /></label><Button className="w-full" disabled={busy || !code.trim()}>{busy ? "Menghubungkan..." : "Hubungkan VPS"}</Button></form> : <><p className="text-xs text-muted">Cadangan terakhir: {last || "Belum tersimpan"}</p><Button variant="secondary" className="w-full" disabled={busy} onClick={() => void action(backupNow, "Cadangan berhasil diperbarui.")}>Cadangkan sekarang</Button><button disabled={busy} onClick={() => void action(disconnectVps, "Koneksi perangkat diputus.")} className="min-h-11 text-sm text-muted underline underline-offset-4">Putuskan koneksi</button><button disabled={busy} onClick={() => { if (confirm("Hapus cadangan perangkat ini di VPS? Catatan lokal tetap tersedia. Koneksi akan diputus agar cadangan tidak dibuat ulang.")) void action(async () => { await vpsRequest("/delete-backup", { device: deviceId() }); await disconnectVps(); localStorage.removeItem("ps.vps-last-backup"); }, "Cadangan VPS dihapus."); }} className="block min-h-11 text-sm text-muted">Hapus cadangan VPS</button></>}
    {connected && backups.length > 0 && <details className="border-t border-border pt-3"><summary className="cursor-pointer py-2 text-sm text-muted">Pulihkan catatan dari VPS</summary><label className="mt-2 block text-xs text-muted">Pilih cadangan<select value={restoreDevice} onChange={(event) => setRestoreDevice(event.target.value)} className="mt-2 w-full rounded-xl border border-border bg-surface-2 p-3 text-sm"><option value="">Pilih perangkat</option>{backups.map((backup) => <option key={backup.device} value={backup.device}>{backup.device.slice(0, 8)} · {new Date(backup.updated * 1000).toLocaleString("id-ID")}</option>)}</select></label><Button variant="secondary" className="mt-3 w-full" disabled={busy || !restoreDevice} onClick={() => { if (confirm("Ganti catatan perangkat ini dengan cadangan pilihan? Ekspor catatan saat ini terlebih dahulu bila ingin menyimpannya.")) void action(async () => { const result = await vpsRequest("/restore", { device: restoreDevice }); if (!result.snapshot) throw new Error("Cadangan tidak ditemukan."); restoreSnapshot(result.snapshot); await backupNow(); }, "Catatan berhasil dipulihkan."); }}>Pulihkan cadangan</Button></details>}
    {message && <p role="status" className="text-sm text-muted">{message}</p>}
    <p className="text-xs leading-relaxed text-muted">Setiap perangkat memiliki cadangan sendiri. Catatan tetap tersedia offline. Kode akses yang sama dapat memulihkan cadangan di perangkat lain.</p>
  </Card>;
}
