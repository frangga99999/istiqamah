// Minimal stroke icons (24×24, currentColor). No icon dependency — the app needs
// only a handful, and hand-rolled SVG stays on-theme (calm, not ornamental).
import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;
const base = (p: P) => ({
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  ...p,
});

export const IconClock = (p: P) => (
  <svg {...base(p)} aria-hidden>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);

export const IconTrend = (p: P) => (
  <svg {...base(p)} aria-hidden>
    <path d="M3 17l6-6 4 4 8-8" />
    <path d="M21 11V7h-4" />
  </svg>
);

export const IconCalendar = (p: P) => (
  <svg {...base(p)} aria-hidden>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 9h18M8 3v4M16 3v4" />
  </svg>
);

export const IconGear = (p: P) => (
  <svg {...base(p)} aria-hidden>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2.5l1.4 2.6 2.9-.6.6 2.9 2.6 1.4-1.3 2.6 1.3 2.6-2.6 1.4-.6 2.9-2.9-.6L12 21.5l-1.4-2.6-2.9.6-.6-2.9L4.5 15l1.3-2.6L4.5 9.8 7.1 8.4l.6-2.9 2.9.6z" />
  </svg>
);

// Simple, recognisable mosque glyph — dome + minaret, kept geometric.
export const IconMosque = (p: P) => (
  <svg {...base(p)} aria-hidden>
    <path d="M4 20v-6a8 8 0 0 1 16 0v6" />
    <path d="M12 6c1.8 1 2.7 2.2 2.7 3.2M12 6c-1.8 1-2.7 2.2-2.7 3.2" />
    <path d="M12 3.2v1.4" />
    <path d="M4 20h16M10 20v-3a2 2 0 0 1 4 0v3" />
    <path d="M6.5 20v-4M17.5 20v-4" />
  </svg>
);

export const IconUsers = (p: P) => (
  <svg {...base(p)} aria-hidden>
    <circle cx="9" cy="8" r="3" />
    <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
    <path d="M16 6.2a3 3 0 0 1 0 5.6M17.5 14.3A5.5 5.5 0 0 1 20.5 19" />
  </svg>
);

export const IconPerson = (p: P) => (
  <svg {...base(p)} aria-hidden>
    <circle cx="12" cy="8" r="3.2" />
    <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
  </svg>
);

export const IconCheck = (p: P) => (
  <svg {...base(p)} aria-hidden>
    <path d="M4 12.5l5 5 11-11" />
  </svg>
);

export const IconChevron = (p: P) => (
  <svg {...base(p)} aria-hidden>
    <path d="M9 6l6 6-6 6" />
  </svg>
);

export const IconBack = (p: P) => (
  <svg {...base(p)} aria-hidden>
    <path d="M15 6l-6 6 6 6" />
  </svg>
);

export const IconBell = (p: P) => (
  <svg {...base(p)} aria-hidden>
    <path d="M6 9a6 6 0 0 1 12 0c0 5 1.5 6 2 7H4c.5-1 2-2 2-7z" />
    <path d="M10 20a2 2 0 0 0 4 0" />
  </svg>
);

export const IconSpark = (p: P) => (
  <svg {...base(p)} aria-hidden>
    <path d="M12 3l1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6z" />
  </svg>
);

export const IconDot = (p: P) => (
  <svg {...base(p)} aria-hidden>
    <circle cx="12" cy="12" r="4.5" />
  </svg>
);
