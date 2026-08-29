"use client";
// Notifications (PRD §46–49). Permission + copy + a foreground scheduler.
// NOTE: foreground timers only fire while the PWA is open; reliable background
// delivery is server Web Push (SW push handler is already in public/sw.js, §87).
import { useEffect } from "react";
import { PRAYER_LABEL } from "@/lib/types";
import { getState } from "@/lib/store";
import type { TodayView } from "@/lib/today";

export type NotifStatus = NotificationPermission | "unsupported";

export function notifyStatus(): NotifStatus {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

export async function enableNotifications(): Promise<NotifStatus> {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

// PRD §47 — short, actionable copy per reminder type.
function copy(prayer: keyof typeof PRAYER_LABEL, lead: number, mosque: boolean, followUp: boolean) {
  const label = PRAYER_LABEL[prayer];
  if (followUp) return { title: `${label} belum tercatat`, body: "Jangan tunda lagi." };
  if (lead <= 0) return { title: `Waktu ${label} telah masuk`, body: "Waktunya shalat." };
  return {
    title: `${label} ${lead} menit lagi`,
    body: mosque ? "Saatnya bersiap ke masjid." : "Selesaikan aktivitas dan mulai bersiap.",
  };
}

function show(title: string, body: string, tag: string) {
  try {
    new Notification(title, { body, icon: "/icon-192.png", badge: "/icon-192.png", tag });
  } catch {
    /* some browsers require SW.showNotification; ignored in foreground MVP */
  }
}

// Schedule the next prayer's reminders as foreground timers. Suppressed at fire
// time if the prayer is already checked in (PRD §49).
function schedule(view: TodayView): number[] {
  const timers: number[] = [];
  const now = Date.now();
  const { next, plan, target } = view;
  const start = next.at.getTime();
  const date = view.date;

  const done = () => Boolean(getState().logs.find((l) => l.date === date && l.prayer === next.prayer)?.performed_at);

  for (const lead of plan.leadTimes) {
    const at = start - lead * 60_000;
    if (at <= now) continue;
    const { title, body } = copy(next.prayer, lead, target.mosque, false);
    const id = window.setTimeout(() => {
      if (!done()) show(title, body, `${date}:${next.prayer}:${lead}`);
    }, at - now);
    timers.push(id);
  }
  if (plan.followUp) {
    const at = start + 15 * 60_000;
    if (at > now) {
      const { title, body } = copy(next.prayer, 0, false, true);
      const id = window.setTimeout(() => {
        if (!done()) show(title, body, `${date}:${next.prayer}:followup`);
      }, at - now);
      timers.push(id);
    }
  }
  return timers;
}

// Reschedules whenever the next prayer changes. Cheap and idempotent.
export function useReminders(view: TodayView | null) {
  const key = view ? `${view.next.prayer}:${view.next.at.getTime()}:${view.plan.leadTimes.join(",")}` : "none";
  useEffect(() => {
    if (!view || notifyStatus() !== "granted") return;
    const timers = schedule(view);
    return () => timers.forEach((t) => clearTimeout(t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}
