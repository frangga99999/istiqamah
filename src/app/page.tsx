"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useApp } from "@/lib/store";
import { asset } from "@/lib/base-path";

export default function Index() {
  const { hydrated, profile } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (!hydrated) return;
    router.replace(profile?.onboarded ? "/today" : "/onboarding");
  }, [hydrated, profile, router]);

  return (
    <div className="flex min-h-dvh items-center justify-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={asset("/icon.svg")} alt="Istiqamah" className="h-16 w-16 animate-pulse rounded-2xl" />
    </div>
  );
}
