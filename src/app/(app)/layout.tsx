"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppGate } from "@/components/app-gate";
import { BottomNav } from "@/components/bottom-nav";
import { IconGear } from "@/components/icons";
import { asset } from "@/lib/base-path";
import { DailyReflectionModal } from "@/components/daily-reflection";

export default function AppLayout({ children }: LayoutProps<"/">) {
  const writing = usePathname().includes("/history/write");
  return (
    <AppGate>
      <div className="mx-auto flex min-h-dvh max-w-md flex-col">
        {!writing && <header className="sticky top-0 z-20 flex items-center justify-between px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-3">
          <Link href="/today" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={asset("/icon.svg")} alt="" className="h-7 w-7 rounded-lg" />
            <span className="text-sm font-semibold tracking-tight text-text">Istiqamah</span>
          </Link>
          <Link
            href="/settings"
            aria-label="Pengaturan"
            className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-text"
          >
            <IconGear width={20} height={20} />
          </Link>
        </header>}
        <main className={writing ? "flex-1 px-4 pb-8" : "flex-1 px-4 pb-24"}>{children}</main>
        {!writing && <BottomNav />}
        <DailyReflectionModal />
      </div>
    </AppGate>
  );
}
