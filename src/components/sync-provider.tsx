"use client";
import { useEffect } from "react";
import { getSupabase, supabaseConfigured } from "@/lib/supabase/client";
import { subscribeStore } from "@/lib/store";
import { fullSync, pushDebounced } from "@/lib/sync";

// Bridges the local store to Supabase when signed in. No-op without env or session,
// so the app stays fully functional local-first (PRD §89/§90).
export function SyncProvider() {
  useEffect(() => {
    if (!supabaseConfigured()) return;
    const sb = getSupabase();
    if (!sb) return;

    let authed = false;
    sb.auth.getSession().then(({ data }) => {
      if (data.session) {
        authed = true;
        void fullSync();
      }
    });
    const { data: sub } = sb.auth.onAuthStateChange((_e, session) => {
      if (session && !authed) {
        authed = true;
        void fullSync();
      } else if (!session) {
        authed = false;
      }
    });
    const unsub = subscribeStore(() => {
      if (authed) pushDebounced();
    });
    return () => {
      sub.subscription.unsubscribe();
      unsub();
    };
  }, []);
  return null;
}
