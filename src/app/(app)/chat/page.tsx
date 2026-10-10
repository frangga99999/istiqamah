"use client";
import { useEffect, useRef, useState } from "react";
import { AIConnection } from "@/components/ai-connection";
import { cx } from "@/components/ui";
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
  const [connected, setConnected] = useState(false);
  const [consent, setConsent] = useState(() => { try { return sessionStorage.getItem("ps.chat-consent") === "yes"; } catch { return false; } });
  const sending = useRef(false);
  const mounted = useRef(true);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [messages, busy]);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => { const refresh = () => setConnected(vpsConnected()); refresh(); window.addEventListener("vps-status", refresh); return () => window.removeEventListener("vps-status", refresh); }, []);
  function remember(next: ChatMessage[]) {
    sessionStorage.setItem("ps.chat", JSON.stringify(next));
    setMessages(next);
  }
  async function send(retry = false) {
    if (sending.current || !consent) return;
    if (!vpsConnected()) { setError("Hubungkan perangkat ini dengan kode akses pribadi, lalu kirim pesan."); return; }
    const next: ChatMessage[] = retry ? messages : [...messages.slice(-98), { role: "user", content: text.trim() }];
    if (!next.length || next.at(-1)?.role !== "user" || !validChat(next)) return;
    sending.current = true; setBusy(true); setError("");
    try {
      remember(next); if (!retry) setText("");
      const result = await vpsRequest("/chat", { messages: chatContext(next) });
      if (typeof result.reply !== "string" || !result.reply.trim() || result.reply.length > 8000) throw new Error("Jawaban belum lengkap. Coba lagi.");
      if (!mounted.current) return;
      remember([...next, { role: "assistant", content: result.reply }]);
    } catch (e) { if (mounted.current) setError(e instanceof Error ? e.message : "Pesan belum berhasil. Coba lagi."); }
    finally { sending.current = false; if (mounted.current) setBusy(false); }
  }
  return <section className="flex h-[calc(100dvh-9rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] min-h-80 flex-col overflow-hidden rounded-2xl border border-border bg-surface">
    <header className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-3"><span className="grid h-10 w-10 place-items-center rounded-full bg-accent-soft text-accent"><IconChat width={21} height={21} /></span><div className="flex-1"><h1 className="text-base font-semibold">Teman cerita</h1><p className="text-xs text-muted">Ruang untuk didengarkan</p></div><details className="relative"><summary aria-label="Menu percakapan" className="grid h-11 w-11 cursor-pointer list-none place-items-center rounded-full text-xl text-muted hover:bg-surface-2">⋯</summary><div className="absolute right-0 top-12 z-20 max-h-[60dvh] w-64 overflow-y-auto rounded-2xl border border-border bg-surface p-3 shadow-xl"><AIConnection /><details className="mt-2 text-xs text-muted"><summary className="min-h-11 cursor-pointer py-3">Tentang percakapan</summary><p className="leading-relaxed">Balasan dibuat oleh model bahasa, bukan manusia, dan bisa keliru. Bukan pengganti psikolog atau tenaga kesehatan. Chat disimpan selama tab ini terbuka.</p></details>{messages.length > 0 && <button disabled={busy} className="min-h-11 text-xs text-muted" onClick={() => { if (confirm("Hapus percakapan di tab ini? Tidak bisa dikembalikan.")) { try { remember([]); setError(""); } catch { setError("Percakapan belum bisa dihapus."); } } }}>Hapus percakapan</button>}</div></details></header>
    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain bg-bg/50 p-4">
      {!connected && <AIConnection />}
      {!messages.length && <div className="flex min-h-48 flex-col justify-center py-6"><h2 className="font-serif text-2xl">Bagaimana harimu?</h2><p className="mt-2 text-sm text-muted">Mulai dari satu cerita kecil.</p><div className="mt-5 flex flex-wrap gap-2">{["Pikiranku sedang ramai", "Ingin lebih konsisten shalat", "Bantu aku refleksi"].map((prompt) => <button key={prompt} className="min-h-11 rounded-2xl border border-border bg-surface px-3 text-left text-xs text-muted" onClick={() => setText(prompt)}>{prompt}</button>)}</div></div>}
      <div role="log" aria-label="Percakapan" aria-live="polite" className="space-y-3">{messages.map((m, i) => <div key={i} aria-label={m.role === "user" ? "Pesanmu" : "Balasan"} className={cx("w-fit max-w-[88%] rounded-2xl px-4 py-3 motion-safe:animate-[ctaIn_160ms_ease-out]", m.role === "user" ? "ml-auto rounded-br-sm bg-accent text-accent-fg" : "rounded-bl-sm border border-border bg-surface")}><p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{m.content}</p></div>)}{busy && <div role="status" aria-label="Sedang mengetik" className="flex w-fit gap-1.5 rounded-2xl rounded-bl-sm border border-border bg-surface px-4 py-4">{[0, 1, 2].map((i) => <span key={i} className="h-1.5 w-1.5 rounded-full bg-muted motion-safe:animate-pulse" style={{ animationDelay: `${i * 150}ms` }} />)}</div>}<div ref={end} /></div>
      {error && <div className="space-y-3"><p role="alert" className="rounded-xl bg-warn-soft p-3 text-sm text-warn">{error}</p>{connected && <AIConnection />}</div>}
      {!busy && messages.at(-1)?.role === "user" && <button disabled={!consent} className="min-h-11 text-sm text-accent underline disabled:opacity-40" onClick={() => void send(true)}>Coba kirim lagi</button>}
    </div>
    <form onSubmit={(e) => { e.preventDefault(); void send(); }} className="shrink-0 border-t border-border bg-surface p-3">
      {!consent && <label className="mb-3 flex items-start gap-2 text-xs leading-relaxed text-muted"><input type="checkbox" checked={consent} onChange={(e) => { setConsent(e.target.checked); try { sessionStorage.setItem("ps.chat-consent", e.target.checked ? "yes" : "no"); } catch { /* Consent still applies to this view when storage is unavailable. */ } }} className="mt-0.5 h-4 w-4 shrink-0" />Aktifkan pengiriman pesan melalui VPS Combo gue dan penyedia modelnya. Jurnal lain tidak dikirim.</label>}
      <div className="flex items-end gap-2"><textarea aria-label="Pesan" rows={2} maxLength={4000} value={text} onChange={(e) => setText(e.target.value)} placeholder="Tulis pesan..." className="min-w-0 flex-1 resize-none rounded-2xl border border-border bg-surface-2 px-3 py-2 text-sm" /><button aria-label="Kirim pesan" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent text-accent-fg transition active:scale-95 disabled:opacity-40" disabled={busy || !consent || !text.trim() || messages.at(-1)?.role === "user"} type="submit"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m12 19 0-14M5 12l7-7 7 7" /></svg></button></div>
    </form>
  </section>;
}
