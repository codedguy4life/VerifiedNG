export const THEME_STORAGE_KEY = "verifiedng-theme";
export const THEME_OPTIONS = ["light", "dark", "system"];

export function normalizeTheme(value) {
  return THEME_OPTIONS.includes(value) ? value : "system";
}

export function readThemePreference(storage) {
  try {
    const target = storage === undefined && typeof window !== "undefined" ? window.localStorage : storage;
    return normalizeTheme(target?.getItem(THEME_STORAGE_KEY));
  } catch {
    return "system";
  }
}

export function resolveTheme(preference, systemIsDark = false) {
  const choice = normalizeTheme(preference);
  return choice === "system" ? (systemIsDark ? "dark" : "light") : choice;
}

// A quick toggle always selects the opposite of the visible mode.
export function nextManualTheme(resolvedTheme) {
  return resolvedTheme === "dark" ? "light" : "dark";
}

export function systemPrefersDark() {
  return typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function applyTheme(preference, root = typeof document !== "undefined" ? document.documentElement : null, systemIsDark = systemPrefersDark()) {
  const resolved = resolveTheme(preference, systemIsDark);
  if (root) {
    root.dataset.theme = resolved;
    root.style.colorScheme = resolved;
  }
  return resolved;
}

export function saveThemePreference(preference, storage) {
  const choice = normalizeTheme(preference);
  try {
    const target = storage === undefined && typeof window !== "undefined" ? window.localStorage : storage;
    target?.setItem(THEME_STORAGE_KEY, choice);
  } catch {
    // A browser may block storage; the current tab can still use the theme.
  }
  return choice;
}
