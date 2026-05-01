const SESSION_TTL = 2 * 60 * 60 * 1000; // 2 hours in ms

const SESSION_KEYS = [
  "upload_result",
  "profile_id",
  "confirmed_profile",
  "suggested_roles",
  "selected_role",
  "analysis_result",
  "active_cv_version",
  "v2_profile_id",
  "v2_suggested_roles",
  "v2_analysis_result",
  "v2_selected_role",
  "session_expires_at",
];

const SESSION_PREFIXES = ["analysis_cache_", "v2_analysis_cache_"];

export function clearSession(): void {
  SESSION_KEYS.forEach((key) => localStorage.removeItem(key));
  const allKeys = Object.keys(localStorage);
  for (const key of allKeys) {
    if (SESSION_PREFIXES.some((prefix) => key.startsWith(prefix))) {
      localStorage.removeItem(key);
    }
  }
}

export function touchSession(): void {
  localStorage.setItem("session_expires_at", String(Date.now() + SESSION_TTL));
}

export function isSessionExpired(): boolean {
  const raw = localStorage.getItem("session_expires_at");
  if (!raw) return true;
  return Date.now() > Number(raw);
}

// Returns true if the session was expired and cleared.
export function checkAndClearIfExpired(): boolean {
  if (isSessionExpired()) {
    clearSession();
    return true;
  }
  return false;
}
