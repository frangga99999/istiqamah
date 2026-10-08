"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { SpiritualJournal } from "@/components/spiritual-journal";
import { useApp } from "@/lib/store";
import { localDateKey } from "@/lib/prayer/times";

function Editor() {
  const params = useSearchParams();
  const state = useApp();
  if (!state.settings) return null;
  const id = params.get("id") ?? undefined;
  const kind = params.get("kind") === "dhikr" ? "dhikr" : "story";
  return <SpiritualJournal editorOnly entryId={id} entryKind={kind} today={localDateKey(state.settings.timezone, new Date())} />;
}

export default function WritePage() {
  return <Suspense fallback={<p className="py-10 text-sm text-muted">Membuka ruangmu...</p>}><Editor /></Suspense>;
}
