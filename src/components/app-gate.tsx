"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useApp } from "@/lib/store";

// Redirect to onboarding until the user has completed it. Renders a quiet splash
// while the local store hydrates (avoids SSR/hydration flash).
export function AppGate({ children }: { children: React.ReactNode }) {
  const { hydrated, profile } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (hydrated && !profile?.onboarded) router.replace("/onboarding");
  }, [hydrated, profile, router]);

  if (!hydrated || !profile?.onboarded) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="h-6 w-6 animate-pulse rounded-full bg-accent-soft" />
      </div>
    );
  }
  return <>{children}</>;
}
