import React from "react";

/**
 * Hook for debouncing values (e.g., search input)
 * Delays updating the value by specified milliseconds
 * @param value - Value to debounce
 * @param delayMs - Delay in milliseconds (default 300ms)
 */
export function useDebounce<T>(value: T, delayMs = 300): T {
  const [debouncedValue, setDebouncedValue] = React.useState(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => clearTimeout(handler);
  }, [value, delayMs]);

  return debouncedValue;
}
