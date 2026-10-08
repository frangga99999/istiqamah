"use client";
import { useEffect, useRef, useState } from "react";
import { AIConnection } from "@/components/ai-connection";
import { Button, cx } from "@/components/ui";
import { IconChat } from "@/components/icons";
import { chatContext, validChat, type ChatMessage } from "@/lib/chat";
import { vpsConnected, vpsRequest } from "@/lib/vps";

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try { const saved: unknown = JSON.parse(sessionStorage.getItem("ps.chat") ?? "[]"); return validChat(saved) ? saved : []; }
    catch { return []; }
  });
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [consent, setConsent] = useState(false);
  const sending = useRef(false);
  const mounted = useRef(true);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [messages, busy]);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  function remember(next: ChatMessage[]) {
    sessionStorage.setItem("ps.chat", JSON.stringify(next));
    setMessages(next);
  }
  async function send(retry = false) {
    if (sending.current || !consent) return;
    if (!vpsConnected()) { setError("Hubungkan akses pribadi di atas terlebih dahulu."); return; }
    const next: ChatMessage[] = retry ? messages : [...messages.slice(-98), { role: "user", content: text.trim() }];
    if (!next.length || next.at(-1)?.role !== "user" || !validChat(next)) return;
    sending.current = true; setBusy(true); setError("");
    try {
      remember(next); if (!retry) setText("");
      const result = await vpsRequest("/chat", { messages: chatContext(next) });
      if (typeof result.reply !== "string" || !result.reply.trim() || result.reply.length > 8000) throw new Error("Jawaban belum lengkap. Coba lagi.");
      if (!mounted.current) return;
      remember([...next, { role: "assistant", content: result.reply }]);
    } catch (e) { setError(e instanceof Error ? e.message : "Pesan belum berhasil. Coba lagi."); }
    finally { sending.current = false; setBusy(false); }
  }
  return <section className="space-y-4">
    <div className="flex items-start justify-between gap-3"><div><h1 className="text-xl font-semibold">Teman cerita</h1><p className="mt-1 text-sm text-muted">Ada yang ingin kamu ceritakan?</p></div>{messages.length > 0 && <button disabled={busy} className="min-h-11 px-2 text-xs text-muted" onClick={() => { if (confirm("Hapus percakapan di tab ini? Tidak bisa dikembalikan.")) { try { remember([]); setError(""); } catch { setError("Percakapan belum bisa dihapus."); } } }}>Hapus chat</button>}</div>
    <AIConnection />
    {!messages.length && <div className="py-8"><IconChat className="mb-4 text-accent" width={32} height={32} /><h2 className="font-serif text-2xl">Mulai dari yang kamu rasakan.</h2><p className="mt-2 text-sm leading-relaxed text-muted">Tidak perlu merangkai kata dengan sempurna.</p><div className="mt-5 space-y-2">{["Hari ini pikiranku sedang ramai.", "Aku ingin lebih konsisten shalat.", "Bantu aku merenungkan hari ini."].map((prompt) => <button key={prompt} className="block min-h-11 w-full rounded-xl border border-border bg-surface p-3 text-left text-sm text-muted" onClick={() => setText(prompt)}>{prompt} ↗</button>)}</div></div>}
    <div role="log" aria-label="Percakapan dengan AI" aria-live="polite" className="space-y-4">{messages.map((m, i) => <div key={i} className={cx("max-w-[92%] rounded-2xl px-4 py-3", m.role === "user" ? "ml-auto rounded-br-sm bg-accent-soft" : "rounded-bl-sm border border-border bg-surface")}><p className="mb-1 text-[11px] text-accent">{m.role === "user" ? "Kamu" : "Teman AI"}</p><p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{m.content}</p></div>)}{busy && <p role="status" className="py-3 text-sm text-muted motion-safe:animate-pulse">Sedang mendengarkan...</p>}<div ref={end} /></div>
    {error && <p role="alert" className="rounded-xl bg-warn-soft p-3 text-sm text-warn">{error}</p>}
    {!busy && messages.at(-1)?.role === "user" && <button disabled={!consent} className="min-h-11 text-sm text-accent underline disabled:opacity-40" onClick={() => void send(true)}>Coba kirim pesan terakhir lagi</button>}
    <form onSubmit={(e) => { e.preventDefault(); void send(); }} className="sticky bottom-16 space-y-3 rounded-2xl border border-border bg-surface p-3 shadow-sm">
      <label className="flex items-start gap-2 text-xs leading-relaxed text-muted"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0" />Kirim percakapan ini melalui VPS Combo gue dan penyedia modelnya. Jurnal lain tidak dikirim.</label>
      <textarea aria-label="Pesan untuk teman AI" rows={3} maxLength={4000} value={text} onChange={(e) => setText(e.target.value)} placeholder="Aku ingin cerita..." className="w-full resize-y rounded-xl border border-border bg-surface-2 p-3 text-sm" />
      <Button className="w-full" disabled={busy || !consent || !text.trim() || messages.at(-1)?.role === "user"} type="submit">{busy ? "Menyiapkan jawaban..." : "Kirim cerita"}</Button>
    </form>
    <p className="text-xs leading-relaxed text-muted">Chat tersimpan hanya selama tab ini terbuka. AI bisa keliru dan bukan pengganti psikolog atau tenaga kesehatan.</p>
  </section>;
}
