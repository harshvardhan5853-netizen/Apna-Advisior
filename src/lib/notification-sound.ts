/**
 * Notification sound utilities.
 *
 * Provides:
 *  - `playSuccess()` — pleasant two-tone chime (~600ms) for extraction complete
 *  - `playFailure()` — softer descending tone for extraction failure
 *
 * Both respect the user's "Play notification sounds" setting and browser
 * autoplay restrictions. Sounds are queued — if multiple extractions finish
 * at nearly the same time each one plays in sequence.
 */

import { readNotificationSettings } from "./notification-settings";

/* ─── AudioContext (lazy, shared) ─── */

let ctx: AudioContext | null = null;

function getContext(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext();
  }
  if (ctx.state === "suspended") {
    void ctx.resume();
  }
  return ctx;
}

/* ─── Sound queue ─── */

let queue: Array<() => void> = [];
let playing = false;

function enqueue(play: () => void): void {
  queue.push(play);
  if (!playing) {
    dequeue();
  }
}

function dequeue(): void {
  const next = queue.shift();
  if (next) {
    playing = true;
    next();
  } else {
    playing = false;
  }
}

/* ─── Success chime: two-note major third (C6 → E6) with gentle decay ─── */

function playSuccessSound(): void {
  try {
    const ac = getContext();
    const now = ac.currentTime;
    const duration = 0.6;

    // First note: C6 (1046.5 Hz)
    const osc1 = ac.createOscillator();
    const gain1 = ac.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(1046.5, now);
    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ac.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Second note: E6 (1318.5 Hz), slightly delayed
    const osc2 = ac.createOscillator();
    const gain2 = ac.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(1318.5, now + 0.12);
    gain2.gain.setValueAtTime(0.1, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc2.connect(gain2);
    gain2.connect(ac.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.6);

    // Schedule dequeue after sound finishes
    setTimeout(dequeue, duration * 1000 + 100);
  } catch {
    playing = false;
    dequeue();
  }
}

/* ─── Failure sound: short descending tone (A4 → E4) ─── */

function playFailureSound(): void {
  try {
    const ac = getContext();
    const now = ac.currentTime;
    const duration = 0.5;

    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(329.6, now + 0.35);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(now);
    osc.stop(now + 0.5);

    setTimeout(dequeue, duration * 1000 + 100);
  } catch {
    playing = false;
    dequeue();
  }
}

/* ─── Public API ─── */

/** Play success chime if notification sounds are enabled. */
export function playSuccess(): void {
  if (!readNotificationSettings().playSounds) return;
  enqueue(playSuccessSound);
}

/** Play failure warning if notification sounds are enabled. */
export function playFailure(): void {
  if (!readNotificationSettings().playSounds) return;
  enqueue(playFailureSound);
}
