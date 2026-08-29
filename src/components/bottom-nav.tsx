"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconCalendar, IconClock, IconTrend } from "@/components/icons";
import { cx } from "@/components/ui";

const items = [
  { href: "/today", label: "Hari Ini", Icon: IconClock },
  { href: "/journey", label: "Perjalanan", Icon: IconTrend },
  { href: "/history", label: "Riwayat", Icon: IconCalendar },
];

export function BottomNav() {
  const path = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-md items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)]">
        {items.map(({ href, label, Icon }) => {
          const active = path === href || path.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cx(
                "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                active ? "text-accent" : "text-subtle hover:text-muted",
              )}
            >
              <Icon width={22} height={22} strokeWidth={active ? 2 : 1.75} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
