import { useState, useEffect } from "react";
import type { ThemeMode } from "../../types";

/**
 * Custom hook for managing theme selection and localStorage persistence.
 * Handles light, dark, and system theme modes.
 */
export function useTheme() {
  const [currentTheme, setCurrentTheme] = useState<ThemeMode>("system");

  useEffect(() => {
    const storedTheme = getThemeFromStorage();
    setCurrentTheme(storedTheme);
    applyTheme(storedTheme);
  }, []);

  const setTheme = (theme: ThemeMode) => {
    setCurrentTheme(theme);
    applyTheme(theme);
    saveThemeToStorage(theme);
  };

  return { currentTheme, setTheme };
}

function getThemeFromStorage(): ThemeMode {
  try {
    const stored = localStorage.getItem("theme");
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
  } catch (e) {
    console.warn("localStorage not available, using system theme");
  }
  return "system";
}

function saveThemeToStorage(theme: ThemeMode): void {
  try {
    localStorage.setItem("theme", theme);
  } catch (e) {
    console.warn("localStorage not available, theme preference not saved");
  }
}

function applyTheme(theme: ThemeMode): void {
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
