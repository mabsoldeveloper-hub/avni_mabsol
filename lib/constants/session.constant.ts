/**
 * Single source of truth for Session Timing configuration.
 * - Super Admin: Persistent access (365 days / 1 year) - never forced to log in again after 1 hour!
 * - Regular Users: Configurable session timeout (default 1 hour, or 2hr, 4hr, 8hr, 24hr, custom).
 */

export const SUPER_ADMIN_SESSION_JWT = "365d"; // Super Admin stays logged in for 1 year
export const SUPER_ADMIN_SESSION_SECONDS = 365 * 24 * 60 * 60;
export const SUPER_ADMIN_SESSION_DAYS = 365;

export const DEFAULT_USER_SESSION_HOURS = 1;
export const DEFAULT_USER_SESSION_MINUTES = DEFAULT_USER_SESSION_HOURS * 60;

export const SESSION_MINUTES = DEFAULT_USER_SESSION_MINUTES;
export const SESSION_DURATION_SECONDS = SESSION_MINUTES * 60;
export const SESSION_DURATION_JWT = `${SESSION_MINUTES}m`;

export const SESSION_CHECK_INTERVAL_MS = 8 * 1000; // Real-time background check every 8 seconds

export const SESSION_TIMEOUT_PRESETS = [
  { label: "1 Hour (Default)", hours: 1 },
  { label: "2 Hours", hours: 2 },
  { label: "4 Hours (Half Day)", hours: 4 },
  { label: "8 Hours (Full Shift)", hours: 8 },
  { label: "12 Hours", hours: 12 },
  { label: "24 Hours (1 Day)", hours: 24 },
] as const;

/**
 * Calculates JWT validity and cookie maxAge based on user role and configured session timeout.
 */
export function getUserSessionDuration(user: any): {
  jwtExpiry: any;
  maxAgeSeconds: number;
  hours: number;
} {
  if (!user) {
    return {
      jwtExpiry: "1h",
      maxAgeSeconds: 3600,
      hours: 1,
    };
  }

  // Super Admin: Persistent access, no 1-hour relogin
  const email = String(user.email || "").toLowerCase().trim();
  const roleType = String(user.roleType || "").toLowerCase().trim();
  const role = String(user.role || "").toLowerCase().trim();
  const isSuper = Boolean(
    user.isSuperAdmin === true ||
    roleType === "superadmin" ||
    role === "superadmin" ||
    email === "mabsoldeveloper@gmail.com" ||
    (typeof user.name === "string" && user.name.toLowerCase().includes("super admin"))
  );

  if (isSuper) {
    return {
      jwtExpiry: SUPER_ADMIN_SESSION_JWT,
      maxAgeSeconds: SUPER_ADMIN_SESSION_SECONDS,
      hours: 8760, // 365 days
    };
  }

  // Regular users: use custom sessionTimeoutHours if configured, else default 1 hour
  const rawHours = Number(user.sessionTimeoutHours);
  const hours = !isNaN(rawHours) && rawHours > 0 ? rawHours : DEFAULT_USER_SESSION_HOURS;
  const safeHours = Math.max(0.25, Math.min(hours, 720)); // between 15 mins and 30 days
  const maxAgeSeconds = Math.round(safeHours * 3600);

  const jwtExpiry = safeHours >= 1 ? `${Math.round(safeHours)}h` : `${Math.round(safeHours * 60)}m`;

  return {
    jwtExpiry,
    maxAgeSeconds,
    hours: safeHours,
  };
}
