"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { getSupabase } from "@/lib/supabase/client";

// Exchanges the OAuth / magic-link code for a session, then returns to the app.
// SyncProvider picks up the new session and runs the initial sync.
export default function AuthCallback() {
  const router = useRouter();
  useEffect(() => {
    const sb = getSupabase();
    if (!sb) {
      router.replace("/today");
      return;
    }
    const code = new URLSearchParams(window.location.search).get("code");
    const done = () => router.replace("/today");
    if (code) sb.auth.exchangeCodeForSession(code).then(done, done);
    else done();
  }, [router]);

  return (
    <div className="flex min-h-dvh items-center justify-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icon.svg" alt="" className="h-12 w-12 animate-pulse rounded-2xl" />
    </div>
  );
}
