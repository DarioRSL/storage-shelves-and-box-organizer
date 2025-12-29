import { atom } from "nanostores";

/**
 * Global theme state for managing light/dark/system mode preference.
 * Persists user's theme preference to localStorage.
 */

export type ThemeMode = "light" | "dark" | "system";

export interface ThemeState {
  mode: ThemeMode;
  effectiveMode: "light" | "dark"; // Resolved theme (accounting for system preference)
  isLoading: boolean;
}

// Initialize theme store with default state
const getInitialTheme = (): ThemeState => ({
  mode: "system",
  effectiveMode: "light",
  isLoading: true,
});

export const themeStore = atom<ThemeState>(getInitialTheme());

/**
 * Initialize theme from localStorage and system preference
 * Should be called on app startup
 */
export function initializeTheme(): void {
  if (typeof window === "undefined") return;

  try {
    // Get saved preference from localStorage
    const saved = localStorage.getItem("theme-mode") as ThemeMode | null;
    const mode = saved || "system";

    // Determine effective theme
    let effectiveMode: "light" | "dark" = "light";

    if (mode === "system") {
      effectiveMode = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    } else {
      effectiveMode = mode as "light" | "dark";
    }

    themeStore.set({
      mode,
      effectiveMode,
      isLoading: false,
    });

    // Apply theme to document
    applyTheme(effectiveMode);

    // Listen to system theme changes if in system mode
    if (mode === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = (e: MediaQueryListEvent) => {
        const newEffectiveMode = e.matches ? "dark" : "light";
        const state = themeStore.get();
        themeStore.set({
          ...state,
          effectiveMode: newEffectiveMode,
        });
        applyTheme(newEffectiveMode);
      };

      mediaQuery.addEventListener("change", handleChange);
    }
  } catch (error) {
    console.error("[Theme Store] Failed to initialize theme:", error);
    themeStore.set({
      mode: "system",
      effectiveMode: "light",
      isLoading: false,
    });
  }
}

/**
 * Set theme mode and persist to localStorage
 */
export function setTheme(mode: ThemeMode): void {
  try {
    // Determine effective theme
    let effectiveMode: "light" | "dark" = "light";

    if (mode === "system") {
      if (typeof window !== "undefined") {
        effectiveMode = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      }
    } else {
      effectiveMode = mode as "light" | "dark";
    }

    themeStore.set({
      mode,
      effectiveMode,
      isLoading: false,
    });

    // Persist to localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem("theme-mode", mode);
    }

    // Apply theme to document
    applyTheme(effectiveMode);
  } catch (error) {
    console.error("[Theme Store] Failed to set theme:", error);
  }
}

/**
 * Get current theme mode
 */
export function getTheme(): ThemeMode {
  return themeStore.get().mode;
}

/**
 * Get effective theme (resolved for system mode)
 */
export function getEffectiveTheme(): "light" | "dark" {
  return themeStore.get().effectiveMode;
}

/**
 * Toggle between light and dark mode (system mode not changed)
 */
export function toggleTheme(): void {
  const state = themeStore.get();

  if (state.mode === "system") {
    // If in system mode, switch to opposite of current effective theme
    const newMode = state.effectiveMode === "dark" ? "light" : "dark";
    setTheme(newMode);
  } else {
    // Otherwise just toggle current mode
    const newMode = state.mode === "dark" ? "light" : "dark";
    setTheme(newMode);
  }
}

/**
 * Apply theme to document
 * Adds/removes dark class from document root
 */
function applyTheme(theme: "light" | "dark"): void {
  if (typeof window === "undefined" || !document.documentElement) return;

  if (theme === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}
