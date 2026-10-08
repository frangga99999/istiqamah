"use client";
import { useEffect, useState } from "react";
import { connectVps, vpsConnected, vpsRequest } from "@/lib/vps";
import { Button } from "@/components/ui";

export function AIConnection() {
  const [connected, setConnected] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    const refresh = () => setConnected(vpsConnected());
    refresh(); window.addEventListener("vps-status", refresh);
    return () => window.removeEventListener("vps-status", refresh);
  }, []);
  async function test() {
    if (busy) return;
    setBusy(true); setMessage("");
    try {
      if (!vpsConnected()) { await connectVps(code); setCode(""); }
      await vpsRequest("/test", {});
      setMessage("Terhubung dan siap mendengarkan.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Belum terhubung. Coba lagi."); }
    finally { setBusy(false); setConnected(vpsConnected()); }
  }
  return <div className="rounded-xl border border-border bg-surface p-3 text-sm">
    {connected ? <details><summary className="min-h-11 cursor-pointer py-3 text-xs text-accent">Akses pribadi · Periksa koneksi</summary><Button variant="secondary" className="w-full" disabled={busy} onClick={test}>{busy ? "Menguji koneksi..." : "Uji koneksi"}</Button></details> : <form onSubmit={(e) => { e.preventDefault(); void test(); }} className="space-y-3">
      <p className="font-medium">Hubungkan ruang ceritamu</p><p className="text-xs leading-relaxed text-muted">Akses hanya untukmu. Masuk sekali di perangkat ini, tanpa pengaturan server.</p>
      <label className="block text-xs text-muted">Kode akses pribadi<input type="password" autoComplete="off" value={code} onChange={(e) => setCode(e.target.value)} className="mt-2 w-full rounded-xl border border-border bg-surface-2 p-3 text-sm" /></label>
      <Button className="w-full" disabled={busy || !code.trim()}>{busy ? "Menghubungkan..." : "Hubungkan & uji"}</Button>
    </form>}
    {message && <p role="status" className="mt-3 text-xs leading-relaxed text-muted">{message}</p>}
  </div>;
}
