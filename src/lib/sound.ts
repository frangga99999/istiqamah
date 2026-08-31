"use client";
// Tiny synthesized chimes (Web Audio) — no audio assets, works offline.
// A bright ascending arpeggio for "done", a soft descending minor for "missed".

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(c: AudioContext, freq: number, start: number, dur: number, type: OscillatorType, gain: number) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  o.connect(g);
  g.connect(c.destination);
  const t = c.currentTime + start;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.start(t);
  o.stop(t + dur + 0.03);
}

// Cheerful — ascending C major arpeggio.
export function playHappy() {
  const c = audio();
  if (!c) return;
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((f, i) => tone(c, f, i * 0.085, 0.22, "triangle", 0.14));
}

// Gentle, wistful — a soft minor step down.
export function playSad() {
  const c = audio();
  if (!c) return;
  tone(c, 415.3, 0, 0.32, "sine", 0.12); // G#4
  tone(c, 311.13, 0.16, 0.5, "sine", 0.12); // D#4
}
