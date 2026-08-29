import type { PerformedLocation } from "@/lib/types";
import { IconCheck, IconMosque, IconPerson, IconUsers } from "@/components/icons";

// How a performed prayer reads at a glance: mosque > congregation > alone.
export function LocationIcon({ loc, size = 19 }: { loc: PerformedLocation; size?: number }) {
  if (loc === "mosque") return <IconMosque width={size} height={size} className="text-mosque" />;
  if (loc === "congregation") return <IconUsers width={size} height={size} className="text-accent" />;
  return <IconCheck width={size} height={size} className="text-ok" strokeWidth={2.25} />;
}

export { IconPerson };

// Glyph for a log in a list (History). Missed = quiet dash, never a red alarm (§102).
export function LogGlyph({
  performed,
  loc,
  size = 19,
}: {
  performed: boolean;
  loc?: PerformedLocation | null;
  size?: number;
}) {
  if (performed && loc) return <LocationIcon loc={loc} size={size} />;
  return <span className="grid place-items-center text-subtle" style={{ width: size, height: size }}>—</span>;
}
