/**
 * Notification sound preferences. Persisted in localStorage.
 */

const KEY = "apna-advisor.notification-settings.v1";

export interface NotificationSettings {
  /** Play notification sounds on extraction complete/failure. */
  playSounds: boolean;
}

const DEFAULTS: NotificationSettings = {
  playSounds: true,
};

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function readNotificationSettings(): NotificationSettings {
  if (!isBrowser()) return { ...DEFAULTS };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<NotificationSettings>;
    return { ...DEFAULTS, ...parsed };
  } catch {
    return { ...DEFAULTS };
  }
}

export function writeNotificationSettings(
  next: Partial<NotificationSettings>,
): NotificationSettings {
  const current = readNotificationSettings();
  const merged = { ...current, ...next };
  if (!isBrowser()) return merged;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(merged));
  } catch {
    /* quota exceeded — ignore */
  }
  return merged;
}
