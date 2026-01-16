import { useState, useEffect, useCallback } from "react";
import type { ThemeMode, UpdateThemeRequest } from "../../types";
import { apiFetch } from "../../lib/api-client";
import { log } from "@/lib/services/logger.client";

/**
 * Custom hook for managing theme selection with database and localStorage sync.
 * Handles light, dark, and system theme modes.
 *
 * Theme priority:
 * 1. Database (source of truth, persisted across devices)
 * 2. localStorage (for fast initial render before DB fetch)
 * 3. Default "system" (if no preference set)
 */
export function useTheme(initialTheme?: ThemeMode) {
  const [currentTheme, setCurrentTheme] = useState<ThemeMode>(initialTheme || "system");
  const [isLoading, setIsLoading] = useState(false);

  // Apply theme on mount and when initialTheme changes
  useEffect(() => {
    if (initialTheme) {
      setCurrentTheme(initialTheme);
      applyTheme(initialTheme);
      saveThemeToStorage(initialTheme);
    } else {
      const storedTheme = getThemeFromStorage();
      setCurrentTheme(storedTheme);
      applyTheme(storedTheme);
    }
  }, [initialTheme]);

  const setTheme = useCallback(async (theme: ThemeMode) => {
    try {
      setIsLoading(true);

      // Optimistically update UI
      setCurrentTheme(theme);
      applyTheme(theme);
      saveThemeToStorage(theme);

      // Persist to database
      await apiFetch<UpdateThemeRequest>("/api/profiles/me/theme", {
        method: "PATCH",
        body: JSON.stringify({ theme_preference: theme }),
      });
    } catch (error) {
      log.error("useTheme save preference error", { error, theme });
      // UI remains updated even if DB save fails (localStorage is backup)
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { currentTheme, setTheme, isLoading };
}

function getThemeFromStorage(): ThemeMode {
  try {
    const stored = localStorage.getItem("theme");
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
  } catch {
    log.warn("useTheme localStorage not available, using system theme");
  }
  return "system";
}

function saveThemeToStorage(theme: ThemeMode): void {
  try {
    localStorage.setItem("theme", theme);
  } catch {
    log.warn("useTheme localStorage not available, theme preference not saved");
  }
}

/**
 * Applies the selected theme to the document element.
 * Exported to allow application-wide theme initialization.
 */
export function applyTheme(theme: ThemeMode): void {
  const htmlElement = document.documentElement;

  if (theme === "dark") {
    htmlElement.classList.add("dark");
  } else if (theme === "light") {
    htmlElement.classList.remove("dark");
  } else {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (prefersDark) {
      htmlElement.classList.add("dark");
    } else {
      htmlElement.classList.remove("dark");
    }
  }
}
