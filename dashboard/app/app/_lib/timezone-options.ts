/** Supported profile timezones + helpers for mobile/desktop pickers. */

export interface TimezoneOption {
  value: string;
  label: string;
  short: string;
  offset: string;
}

export const TIMEZONE_OPTIONS: TimezoneOption[] = [
  { value: "Asia/Colombo", label: "Asia/Colombo — Sri Lanka", short: "Sri Lanka", offset: "UTC+5:30" },
  { value: "Asia/Kolkata", label: "Asia/Kolkata — India", short: "India", offset: "UTC+5:30" },
  { value: "Asia/Dubai", label: "Asia/Dubai — UAE", short: "UAE", offset: "UTC+4" },
  { value: "Asia/Singapore", label: "Asia/Singapore", short: "Singapore", offset: "UTC+8" },
  { value: "Europe/London", label: "Europe/London — UK", short: "UK", offset: "UTC+0/+1" },
  { value: "Europe/Berlin", label: "Europe/Berlin — EU", short: "EU", offset: "UTC+1/+2" },
  { value: "America/New_York", label: "America/New_York — EST", short: "US East", offset: "UTC-5/-4" },
  { value: "America/Los_Angeles", label: "America/Los_Angeles — PST", short: "US West", offset: "UTC-8/-7" },
  { value: "UTC", label: "UTC", short: "UTC", offset: "UTC+0" },
];

export const MARKET_TIMEZONE = "Asia/Colombo";
export const TZ_STORAGE_KEY = "ct_user_timezone";

/** Map common aliases so select always has a valid option. */
const ALIASES: Record<string, string> = {
  "Asia/Calcutta": "Asia/Kolkata",
  "Asia/Columbo": "Asia/Colombo",
  "US/Eastern": "America/New_York",
  "US/Pacific": "America/Los_Angeles",
  "GMT": "UTC",
  "Etc/UTC": "UTC",
  "Etc/GMT": "UTC",
};

export function normalizeTimezone(raw: string | null | undefined): string {
  if (!raw || typeof raw !== "string") return MARKET_TIMEZONE;
  const t = raw.trim();
  if (ALIASES[t]) return ALIASES[t];
  if (TIMEZONE_OPTIONS.some(o => o.value === t)) return t;
  // Unknown IANA — keep if valid-looking, else Colombo
  try {
    Intl.DateTimeFormat(undefined, { timeZone: t });
    return t;
  } catch {
    return MARKET_TIMEZONE;
  }
}

export function getTimezoneOption(value: string): TimezoneOption {
  const v = normalizeTimezone(value);
  return (
    TIMEZONE_OPTIONS.find(o => o.value === v) || {
      value: v,
      label: v,
      short: v.split("/").pop() || v,
      offset: "",
    }
  );
}

/** Build option list including device TZ if not already present. */
export function buildTimezoneOptions(deviceTz?: string | null): TimezoneOption[] {
  const list = [...TIMEZONE_OPTIONS];
  if (deviceTz) {
    const n = normalizeTimezone(deviceTz);
    if (!list.some(o => o.value === n) && n !== deviceTz) {
      // device mapped to known
    } else if (!list.some(o => o.value === deviceTz) && !list.some(o => o.value === n)) {
      list.unshift({
        value: deviceTz,
        label: `${deviceTz} — Device`,
        short: "Device",
        offset: "",
      });
    }
  }
  return list;
}

export function readStoredTimezone(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(TZ_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function writeStoredTimezone(tz: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(TZ_STORAGE_KEY, normalizeTimezone(tz));
  } catch {
    /* ignore */
  }
}

/** Format current time in a given IANA zone as HH:mm */
export function formatTimeInZone(timeZone: string, now = new Date()): string {
  try {
    const fmt = new Intl.DateTimeFormat("en-GB", {
      timeZone: normalizeTimezone(timeZone),
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
    return fmt.format(now);
  } catch {
    return "—";
  }
}

export function getTimezoneOffsetLabel(timeZone: string, now = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: normalizeTimezone(timeZone),
      timeZoneName: "shortOffset",
    }).formatToParts(now);
    const off = parts.find(p => p.type === "timeZoneName")?.value;
    if (off) return off.replace("GMT", "UTC");
  } catch { /* */ }
  return "";
}
