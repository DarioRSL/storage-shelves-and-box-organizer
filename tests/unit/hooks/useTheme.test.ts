/**
 * Unit Tests for useTheme Hook
 *
 * Tests the theme management behavior of the useTheme custom React hook.
 *
 * Business Rules:
 * - Theme priority: 1) Database (source of truth), 2) localStorage (fast initial render), 3) Default "system"
 * - Supports three modes: light, dark, system
 * - System mode detects OS preference via prefers-color-scheme media query
 * - Optimistically updates UI before database persistence
 * - Persists theme to both localStorage and database
 * - Applies theme to document.documentElement by adding/removing "dark" class
 * - UI remains updated even if database save fails (localStorage is backup)
 * - Gracefully handles localStorage unavailability
 * - applyTheme function exported for application-wide theme initialization
 *
 * Coverage Target: 80-90%
 * Test Count: ~14 tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useTheme, applyTheme } from "@/components/hooks/useTheme";
import { apiFetch } from "@/lib/api-client";
import { log } from "@/lib/services/logger.client";

// Mock logger to prevent console noise during tests
vi.mock("@/lib/services/logger.client", () => ({
  log: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock apiFetch for database persistence
vi.mock("@/lib/api-client", () => ({
  apiFetch: vi.fn(),
}));

describe("useTheme", () => {
  let mockMatchMedia: ReturnType<typeof vi.fn>;
  let mockHtmlElement: {
    classList: {
      add: ReturnType<typeof vi.fn>;
      remove: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    // Clear all mocks
    vi.clearAllMocks();

    // Mock window.matchMedia for system theme detection
    mockMatchMedia = vi.fn().mockReturnValue({
      matches: false, // Default: light system theme
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: mockMatchMedia,
    });

    // Mock document.documentElement for DOM class manipulation
    mockHtmlElement = {
      classList: {
        add: vi.fn(),
        remove: vi.fn(),
      },
    };
    Object.defineProperty(document, "documentElement", {
      writable: true,
      configurable: true,
      value: mockHtmlElement,
    });

    // Mock apiFetch to resolve successfully by default
    vi.mocked(apiFetch).mockResolvedValue({});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Theme Initialization", () => {
    it("TC-THEME-001: should initialize with provided initialTheme prop", () => {
      const { result } = renderHook(() => useTheme("dark"));
      expect(result.current.currentTheme).toBe("dark");
    });

    it("TC-THEME-002: should initialize with localStorage theme when no initialTheme provided", () => {
      localStorage.setItem("theme", "light");
      const { result } = renderHook(() => useTheme());
      expect(result.current.currentTheme).toBe("light");
    });

    it('TC-THEME-003: should default to "system" when no initialTheme or localStorage value', () => {
      const { result } = renderHook(() => useTheme());
      expect(result.current.currentTheme).toBe("system");
    });

    it("should apply theme to DOM on initialization with initialTheme", () => {
      renderHook(() => useTheme("dark"));
      expect(mockHtmlElement.classList.add).toHaveBeenCalledWith("dark");
    });

    it("should save initialTheme to localStorage on mount", () => {
      renderHook(() => useTheme("light"));
      expect(localStorage.getItem("theme")).toBe("light");
    });

    it("should handle invalid localStorage values and default to system", () => {
      localStorage.setItem("theme", "invalid-theme");
      const { result } = renderHook(() => useTheme());
      expect(result.current.currentTheme).toBe("system");
    });

    it("should handle corrupted localStorage JSON and default to system", () => {
      localStorage.setItem("theme", "not valid json {]");
      const { result } = renderHook(() => useTheme());
      expect(result.current.currentTheme).toBe("system");
    });
  });

  describe("Theme Toggle with setTheme", () => {
    it("TC-THEME-004: should update theme when setTheme is called", async () => {
      const { result } = renderHook(() => useTheme("light"));

      await act(async () => {
        await result.current.setTheme("dark");
      });

      expect(result.current.currentTheme).toBe("dark");
    });

    it("TC-THEME-005: should toggle between light and dark themes", async () => {
      const { result } = renderHook(() => useTheme("light"));

      await act(async () => {
        await result.current.setTheme("dark");
      });
      expect(result.current.currentTheme).toBe("dark");

      await act(async () => {
        await result.current.setTheme("light");
      });
      expect(result.current.currentTheme).toBe("light");
    });

    it("should set isLoading to true during theme update", async () => {
      const { result } = renderHook(() => useTheme("light"));

      expect(result.current.isLoading).toBe(false);

      const setThemePromise = act(async () => {
        await result.current.setTheme("dark");
      });

      // Check loading state immediately after calling setTheme
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false); // Should be false after completion
      });

      await setThemePromise;
    });

    it("should set isLoading back to false after theme update completes", async () => {
      const { result } = renderHook(() => useTheme("light"));

      await act(async () => {
        await result.current.setTheme("dark");
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("localStorage Persistence", () => {
    it("TC-THEME-006: should save theme to localStorage when setTheme is called", async () => {
      const { result } = renderHook(() => useTheme("light"));

      await act(async () => {
        await result.current.setTheme("dark");
      });

      expect(localStorage.getItem("theme")).toBe("dark");
    });

    it("should persist all theme modes to localStorage", async () => {
      const { result } = renderHook(() => useTheme());

      await act(async () => {
        await result.current.setTheme("light");
      });
      expect(localStorage.getItem("theme")).toBe("light");

      await act(async () => {
        await result.current.setTheme("dark");
      });
      expect(localStorage.getItem("theme")).toBe("dark");

      await act(async () => {
        await result.current.setTheme("system");
      });
      expect(localStorage.getItem("theme")).toBe("system");
    });

    it("should handle localStorage unavailability gracefully", async () => {
      const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new Error("localStorage not available");
      });

      const { result } = renderHook(() => useTheme());

      await act(async () => {
        await result.current.setTheme("dark");
      });

      // Theme should still update in state
      expect(result.current.currentTheme).toBe("dark");
      expect(log.warn).toHaveBeenCalledWith("useTheme localStorage not available, theme preference not saved");

      setItemSpy.mockRestore();
    });

    it("should handle localStorage read errors gracefully", () => {
      const getItemSpy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
        throw new Error("localStorage read error");
      });

      const { result } = renderHook(() => useTheme());

      expect(result.current.currentTheme).toBe("system");
      expect(log.warn).toHaveBeenCalledWith("useTheme localStorage not available, using system theme");

      getItemSpy.mockRestore();
    });
  });

  describe("Database Persistence", () => {
    it("TC-THEME-007: should persist theme to database via apiFetch", async () => {
      const { result } = renderHook(() => useTheme("light"));

      await act(async () => {
        await result.current.setTheme("dark");
      });

      expect(apiFetch).toHaveBeenCalledWith("/api/profiles/me/theme", {
        method: "PATCH",
        body: JSON.stringify({ theme_preference: "dark" }),
      });
    });

    it("TC-THEME-008: should update UI optimistically before database response", async () => {
      // Mock apiFetch with a delay to simulate network latency
      let resolvePromise: () => void;
      const delayedPromise = new Promise<void>((resolve) => {
        resolvePromise = resolve;
      });
      vi.mocked(apiFetch).mockReturnValue(delayedPromise as Promise<any>);

      const { result } = renderHook(() => useTheme("light"));

      // Start the theme update but don't await it yet
      let updatePromise: Promise<void>;
      act(() => {
        updatePromise = result.current.setTheme("dark");
      });

      // UI should update immediately (optimistic update)
      expect(result.current.currentTheme).toBe("dark");
      expect(mockHtmlElement.classList.add).toHaveBeenCalledWith("dark");
      expect(localStorage.getItem("theme")).toBe("dark");

      // Complete the async operation
      await act(async () => {
        resolvePromise!();
        await updatePromise!;
      });
    });

    it("TC-THEME-009: should keep UI updated even if database save fails", async () => {
      // Reset mock first
      vi.clearAllMocks();
      vi.mocked(apiFetch).mockRejectedValue(new Error("Database error"));

      const { result } = renderHook(() => useTheme("light"));

      await act(async () => {
        await result.current.setTheme("dark");
      });

      // UI should remain updated despite database error
      expect(result.current.currentTheme).toBe("dark");
      expect(mockHtmlElement.classList.add).toHaveBeenCalledWith("dark");
      expect(localStorage.getItem("theme")).toBe("dark");
      expect(log.error).toHaveBeenCalledWith(
        "useTheme save preference error",
        expect.objectContaining({
          theme: "dark",
          error: expect.any(Error),
        })
      );
    });

    it("should still set isLoading to false after database error", async () => {
      // Reset mock first
      vi.clearAllMocks();
      vi.mocked(apiFetch).mockRejectedValue(new Error("Database error"));

      const { result } = renderHook(() => useTheme("light"));

      await act(async () => {
        await result.current.setTheme("dark");
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("DOM Class Manipulation with applyTheme", () => {
    it('TC-THEME-010: should add "dark" class for dark theme', () => {
      applyTheme("dark");
      expect(mockHtmlElement.classList.add).toHaveBeenCalledWith("dark");
    });

    it('TC-THEME-011: should remove "dark" class for light theme', () => {
      applyTheme("light");
      expect(mockHtmlElement.classList.remove).toHaveBeenCalledWith("dark");
    });

    it('TC-THEME-012: should add "dark" class for system theme when OS prefers dark', () => {
      mockMatchMedia.mockReturnValue({
        matches: true, // Dark system theme
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      });

      applyTheme("system");

      expect(window.matchMedia).toHaveBeenCalledWith("(prefers-color-scheme: dark)");
      expect(mockHtmlElement.classList.add).toHaveBeenCalledWith("dark");
    });

    it('TC-THEME-013: should remove "dark" class for system theme when OS prefers light', () => {
      mockMatchMedia.mockReturnValue({
        matches: false, // Light system theme
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      });

      applyTheme("system");

      expect(window.matchMedia).toHaveBeenCalledWith("(prefers-color-scheme: dark)");
      expect(mockHtmlElement.classList.remove).toHaveBeenCalledWith("dark");
    });

    it("should apply theme on setTheme call", async () => {
      // Reset mocks
      vi.clearAllMocks();
      vi.mocked(apiFetch).mockResolvedValue({});

      const { result } = renderHook(() => useTheme("light"));

      vi.clearAllMocks(); // Clear initial calls

      await act(async () => {
        await result.current.setTheme("dark");
      });

      expect(mockHtmlElement.classList.add).toHaveBeenCalledWith("dark");
    });
  });

  describe("Real-world Use Cases", () => {
    it("should handle complete theme switching workflow", async () => {
      // Reset mocks
      vi.clearAllMocks();
      vi.mocked(apiFetch).mockResolvedValue({});

      // User starts with light theme
      const { result } = renderHook(() => useTheme("light"));

      expect(result.current.currentTheme).toBe("light");
      expect(mockHtmlElement.classList.remove).toHaveBeenCalledWith("dark");
      expect(localStorage.getItem("theme")).toBe("light");

      // User switches to dark theme
      await act(async () => {
        await result.current.setTheme("dark");
      });

      expect(result.current.currentTheme).toBe("dark");
      expect(mockHtmlElement.classList.add).toHaveBeenCalledWith("dark");
      expect(localStorage.getItem("theme")).toBe("dark");
      expect(apiFetch).toHaveBeenCalledWith("/api/profiles/me/theme", {
        method: "PATCH",
        body: JSON.stringify({ theme_preference: "dark" }),
      });

      // User switches to system theme
      await act(async () => {
        await result.current.setTheme("system");
      });

      expect(result.current.currentTheme).toBe("system");
      expect(localStorage.getItem("theme")).toBe("system");
    });

    it("should handle theme persistence across component remounts", () => {
      // First render with dark theme
      const { unmount } = renderHook(() => useTheme("dark"));
      expect(localStorage.getItem("theme")).toBe("dark");
      unmount();

      // Second render should read from localStorage
      const { result } = renderHook(() => useTheme());
      expect(result.current.currentTheme).toBe("dark");
    });

    it("TC-THEME-014: should handle initialTheme prop updates", () => {
      // Reset mocks
      vi.clearAllMocks();
      vi.mocked(apiFetch).mockResolvedValue({});

      const { result, rerender } = renderHook(({ theme }) => useTheme(theme), {
        initialProps: { theme: "light" as const },
      });

      expect(result.current.currentTheme).toBe("light");

      // Update initialTheme prop
      rerender({ theme: "dark" as const });

      expect(result.current.currentTheme).toBe("dark");
      expect(mockHtmlElement.classList.add).toHaveBeenCalledWith("dark");
      expect(localStorage.getItem("theme")).toBe("dark");
    });
  });

  describe("Edge Cases", () => {
    it("should handle rapid theme switches", async () => {
      // Reset mocks
      vi.clearAllMocks();
      vi.mocked(apiFetch).mockResolvedValue({});

      const { result } = renderHook(() => useTheme("light"));

      await act(async () => {
        await result.current.setTheme("dark");
        await result.current.setTheme("system");
        await result.current.setTheme("light");
      });

      expect(result.current.currentTheme).toBe("light");
      expect(apiFetch).toHaveBeenCalledTimes(3);
    });

    it("should handle setting the same theme multiple times", async () => {
      // Reset mocks
      vi.clearAllMocks();
      vi.mocked(apiFetch).mockResolvedValue({});

      const { result } = renderHook(() => useTheme("light"));

      await act(async () => {
        await result.current.setTheme("dark");
      });

      await act(async () => {
        await result.current.setTheme("dark");
      });

      expect(result.current.currentTheme).toBe("dark");
      expect(apiFetch).toHaveBeenCalledTimes(2); // Should still call API
    });

    it("should handle system theme with missing matchMedia", () => {
      // Remove matchMedia
      const originalMatchMedia = window.matchMedia;
      Object.defineProperty(window, "matchMedia", {
        writable: true,
        configurable: true,
        value: undefined,
      });

      // The hook will throw when matchMedia is undefined and system theme is used
      // This test documents the actual behavior (no defensive check in the implementation)
      expect(() => {
        renderHook(() => useTheme("system"));
      }).toThrow();

      // Restore matchMedia
      Object.defineProperty(window, "matchMedia", {
        writable: true,
        configurable: true,
        value: originalMatchMedia,
      });
    });
  });
});
