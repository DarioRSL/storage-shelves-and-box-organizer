import { useState, useEffect, useCallback } from "react";

/**
 * Safe localStorage access hook with type safety and fallback for private browsing.
 * Handles JSON stringify/parse automatically.
 *
 * Features:
 * - Type-safe with generics
 * - Automatic JSON stringify/parse
 * - Fallback to in-memory storage if localStorage unavailable
 * - onChange listener support
 * - SSR safe (checks if localStorage exists)
 *
 * Usage:
 * ```typescript
 * // Simple state
 * const [theme, setTheme] = useLocalStorage('theme', 'light');
 *
 * // Complex object
 * const [user, setUser] = useLocalStorage('user', { name: '', email: '' });
 *
 * // With onChange listener
 * const [settings, setSettings] = useLocalStorage('settings', defaults, {
 *   onchange: (newValue) => console.log('Settings updated', newValue)
 * });
 * ```
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  options?: {
    onChange?: (value: T) => void;
  }
): [T, (value: T | ((prev: T) => T)) => void] {
  // Check if localStorage is available (SSR safe)
  const isLocalStorageAvailable = () => {
    if (typeof window === "undefined") return false;
    try {
      const test = "__localStorage_test__";
      window.localStorage.setItem(test, test);
      window.localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  };

  // In-memory fallback for when localStorage is unavailable
  const fallbackStorage = new Map<string, string>();
  const hasLocalStorage = isLocalStorageAvailable();

  // Initialize state with value from localStorage or initial value
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") {
      return initialValue;
    }

    try {
      if (hasLocalStorage) {
        const item = window.localStorage.getItem(key);
        if (item) {
          return JSON.parse(item) as T;
        }
      } else {
        const item = fallbackStorage.get(key);
        if (item) {
          return JSON.parse(item) as T;
        }
      }
      return initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Set value in localStorage
  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value;

        setStoredValue(valueToStore);

        // Call onChange callback
        options?.onChange?.(valueToStore);

        // Store in localStorage or fallback
        if (hasLocalStorage) {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
        } else {
          fallbackStorage.set(key, JSON.stringify(valueToStore));
        }
      } catch (error) {
        console.error(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key, storedValue, options, hasLocalStorage]
  );

  // Listen to storage events (syncing across tabs)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue) {
        try {
          const newValue = JSON.parse(e.newValue) as T;
          setStoredValue(newValue);
          options?.onChange?.(newValue);
        } catch (error) {
          console.error(`Error parsing storage event for key "${key}":`, error);
        }
      }
    };

    if (hasLocalStorage) {
      window.addEventListener("storage", handleStorageChange);
      return () => window.removeEventListener("storage", handleStorageChange);
    }
  }, [key, hasLocalStorage, options]);

  return [storedValue, setValue];
}
