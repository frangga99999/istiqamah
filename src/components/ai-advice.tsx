"use client";
import { useState } from "react";
import { aiEnabled, askWellbeing, type AIResult } from "@/lib/ai";
import { Button } from "@/components/ui";

export function AIAdvice({ mode, context, onResult }: { mode: "questions" | "reflection" | "fasting"; context: Record<string, string>; onResult?: (result: AIResult) => void }) {
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [answer, setAnswer] = useState<AIResult | null>(null);
  if (!aiEnabled) return <p className="text-xs leading-relaxed text-muted">AI belum aktif. Pencatatan tetap tersedia; pertanyaan dan panduan saat ini adalah versi standar.</p>;
  async function request() {
    setBusy(true); setError(""); setAnswer(null);
    try {
      const result = await askWellbeing(mode, context);
      onResult?.(result);
      setAnswer(result);
    } catch (err) { setError(err instanceof Error ? err.message : "AI belum bisa dihubungi. Coba lagi nanti."); }
    finally { setBusy(false); }
  }
  return <div className="space-y-3 rounded-xl border border-accent/25 p-3">
    <p className="text-sm font-medium text-accent">Pendamping AI</p>
    <label className="flex items-start gap-2 text-xs leading-relaxed text-muted"><input className="mt-1 h-4 w-4 shrink-0" type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />{mode === "questions" ? "Saya ingin AI menyusun dua pertanyaan refleksi. Tidak ada isi jurnal yang dikirim." : "Saya setuju mengirim jawaban pada bagian ini melalui VPS Combo gue dan penyedia modelnya untuk memperoleh saran. Isi jurnal lain tidak dikirim."}</label>
    <Button variant="secondary" className="w-full" disabled={!consent || busy} onClick={request}>{busy ? "Sedang menyiapkan..." : mode === "questions" ? "Sesuaikan pertanyaan dengan AI" : mode === "fasting" ? "Minta saran puasa dari AI" : "Minta refleksi dari AI"}</Button>
    {error && <p role="alert" className="text-sm text-warn">{error}</p>}
    {answer && mode !== "questions" && !(mode === "reflection" && onResult) && <div aria-live="polite" className="space-y-3 text-sm leading-relaxed text-muted">{mode === "reflection" ? <p>{answer.reflection}</p> : ([ ["Nutrisi", answer.nutrition], ["Tidur", answer.sleep], ["Kesehatan", answer.health], ["Spiritualitas", answer.spiritual] ]).map(([label, text]) => <div key={label}><h4 className="font-medium text-text">{label}</h4><p>{text}</p></div>)}<p className="text-xs">Saran AI dapat keliru. Ini pendamping refleksi, bukan pengganti psikolog atau tenaga kesehatan.</p></div>}
  </div>;
}
