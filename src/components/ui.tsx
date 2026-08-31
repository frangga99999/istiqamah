"use client";
import { type ButtonHTMLAttributes, type CSSProperties, type ReactNode, useEffect } from "react";

function cx(...c: (string | false | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

type Variant = "primary" | "secondary" | "ghost" | "danger" | "hero";
const variants: Record<Variant, string> = {
  primary: "rounded-xl bg-accent text-accent-fg hover:bg-accent-strong active:scale-[0.99]",
  secondary: "rounded-xl bg-surface-2 text-text hover:bg-border active:scale-[0.99]",
  ghost: "rounded-xl bg-transparent text-muted hover:text-text hover:bg-surface-2",
  danger: "rounded-xl bg-danger-soft text-danger hover:brightness-95",
  // Prominent pill CTA: gradient + soft glow, for the primary action on Home.
  hero: "rounded-full bg-gradient-to-b from-accent to-accent-strong text-accent-fg shadow-lg shadow-accent/25 hover:brightness-[1.06] active:scale-[0.98]",
};

export function Button({
  variant = "primary",
  className,
  children,
  ...rest
}: { variant?: Variant } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cx(
        "inline-flex min-h-12 items-center justify-center gap-2 px-5 text-[15px] font-medium",
        "transition disabled:opacity-40 disabled:pointer-events-none",
        variants[variant],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Card({
  className,
  children,
  style,
}: {
  className?: string;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div className={cx("rounded-2xl border border-border bg-surface", className)} style={style}>
      {children}
    </div>
  );
}

// Bottom sheet for check-in and quick prompts (PRD §27 — 1–2 interactions).
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative w-full max-w-md rounded-t-3xl border border-border bg-surface p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl"
        style={{ animation: "sheetUp .22s ease-out" }}
      >
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-border sm:hidden" />
        {title && <h2 className="mb-4 text-center text-base font-semibold text-text">{title}</h2>}
        {children}
      </div>
      <style>{`@keyframes sheetUp{from{transform:translateY(12px);opacity:.6}to{transform:translateY(0);opacity:1}}`}</style>
    </div>
  );
}

export { cx };
