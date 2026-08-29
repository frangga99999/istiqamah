"use client";
import Link from "next/link";
import { useState } from "react";
import { getSupabase, supabaseConfigured } from "@/lib/supabase/client";
import { Button, Card } from "@/components/ui";
import { IconBack } from "@/components/icons";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const configured = supabaseConfigured();

  async function magicLink(e: React.FormEvent) {
    e.preventDefault();
    const sb = getSupabase();
    if (!sb || !email) return;
    setBusy(true);
    setErr(null);
    const { error } = await sb.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/auth/callback` },
    });
    setBusy(false);
    if (error) setErr(error.message);
    else setSent(true);
  }

  async function google() {
    const sb = getSupabase();
    if (!sb) return;
    await sb.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-6 pb-10 pt-[calc(env(safe-area-inset-top)+1rem)]">
      <Link href="/today" aria-label="Kembali" className="mb-8 grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-surface-2">
        <IconBack width={20} height={20} />
      </Link>

      <div className="flex flex-1 flex-col justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon.svg" alt="" className="mb-6 h-14 w-14 rounded-2xl" />
        <h1 className="text-2xl font-semibold tracking-tight text-text">Simpan & sinkronkan</h1>
        <p className="mt-2 text-sm text-muted">
          Masuk untuk mencadangkan catatanmu dan memakainya di perangkat lain. Kamu tetap bisa
          memakai aplikasi tanpa akun.
        </p>

        {!configured ? (
          <Card className="mt-6 p-4 text-sm text-muted">
            Sinkronisasi belum dikonfigurasi. Aplikasi berjalan penuh secara lokal di perangkat ini.
          </Card>
        ) : sent ? (
          <Card className="mt-6 p-4 text-sm text-text">
            Tautan masuk telah dikirim ke <span className="font-medium">{email}</span>. Periksa
            emailmu.
          </Card>
        ) : (
          <div className="mt-7 space-y-3">
            <Button variant="secondary" className="w-full" onClick={google}>
              Lanjut dengan Google
            </Button>
            <div className="py-1 text-center text-xs text-subtle">atau</div>
            <form onSubmit={magicLink} className="space-y-3">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@contoh.com"
                className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-[15px] text-text placeholder:text-subtle focus:border-accent focus:outline-none"
              />
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "Mengirim…" : "Kirim tautan masuk"}
              </Button>
            </form>
            {err && <p className="text-sm text-danger">{err}</p>}
          </div>
        )}

        <Link href="/today" className="mt-6 block text-center text-sm text-muted underline underline-offset-4">
          Lanjut tanpa akun
        </Link>
      </div>
    </div>
  );
}
