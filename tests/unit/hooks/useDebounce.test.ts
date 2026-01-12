/**
 * Unit Tests for useDebounce Hook
 *
 * Tests the debouncing behavior of the useDebounce custom React hook.
 *
 * Business Rules:
 * - Returns initial value immediately on first render
 * - Delays updating the value by specified milliseconds (default 300ms)
 * - Cancels previous timeouts on rapid value changes
 * - Cleans up timeout when component unmounts or value/delay changes
 * - Works with generic types (string, number, object, etc.)
 *
 * Coverage Target: 100%
 * Test Count: ~18-20 tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebounce } from '@/components/hooks/useDebounce';

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial value behavior', () => {
    it('TC-DEB-001: should return initial value immediately', () => {
      const { result } = renderHook(() => useDebounce('initial', 300));
      expect(result.current).toBe('initial');
    });

    it('should return initial number value immediately', () => {
      const { result } = renderHook(() => useDebounce(42, 300));
      expect(result.current).toBe(42);
    });

    it('should return initial object value immediately', () => {
      const obj = { key: 'value' };
      const { result } = renderHook(() => useDebounce(obj, 300));
      expect(result.current).toBe(obj);
    });

    it('should return initial null value immediately', () => {
      const { result } = renderHook(() => useDebounce(null, 300));
      expect(result.current).toBeNull();
    });

    it('should return initial undefined value immediately', () => {
      const { result } = renderHook(() => useDebounce(undefined, 300));
      expect(result.current).toBeUndefined();
    });
  });

  describe('Debouncing behavior', () => {
    it('TC-DEB-002: should debounce value changes', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: 'initial', delay: 300 } }
      );

      // Initial value
      expect(result.current).toBe('initial');

      // Update value
      rerender({ value: 'updated', delay: 300 });
      expect(result.current).toBe('initial'); // Still old value

      // Fast-forward time
      act(() => {
        vi.advanceTimersByTime(300);
      });
      expect(result.current).toBe('updated'); // Now updated
    });

    it('TC-DEB-003: should respect custom delay', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 500), // 500ms delay
        { initialProps: { value: 'initial' } }
      );

      rerender({ value: 'updated' });

      act(() => {
        vi.advanceTimersByTime(300);
      });
      expect(result.current).toBe('initial'); // Not yet updated

      act(() => {
        vi.advanceTimersByTime(200); // Total 500ms
      });
      expect(result.current).toBe('updated'); // Now updated
    });

    it('TC-DEB-006: should use default delay of 300ms when not specified', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value), // No delay specified
        { initialProps: { value: 'initial' } }
      );

      rerender({ value: 'updated' });
      act(() => {
        vi.advanceTimersByTime(299);
      });
      expect(result.current).toBe('initial');

      act(() => {
        vi.advanceTimersByTime(1); // Total 300ms
      });
      expect(result.current).toBe('updated');
    });

    it('should debounce with very short delay (0ms)', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 0),
        { initialProps: { value: 'initial' } }
      );

      rerender({ value: 'updated' });
      expect(result.current).toBe('initial');

      act(() => {
        vi.advanceTimersByTime(0);
      });
      expect(result.current).toBe('updated');
    });

    it('should debounce with very long delay (5000ms)', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 5000),
        { initialProps: { value: 'initial' } }
      );

      rerender({ value: 'updated' });
      act(() => {
        vi.advanceTimersByTime(4999);
      });
      expect(result.current).toBe('initial');

      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(result.current).toBe('updated');
    });
  });

  describe('Rapid changes and timeout cancellation', () => {
    it('TC-DEB-004: should cancel previous timeout on rapid changes', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 300),
        { initialProps: { value: 'first' } }
      );

      // Simulate rapid typing with incomplete delays
      rerender({ value: 'second' });
      act(() => {
        vi.advanceTimersByTime(100); // Not enough time
      });

      rerender({ value: 'third' });
      act(() => {
        vi.advanceTimersByTime(100); // Still not enough (total 200ms from 'second')
      });

      expect(result.current).toBe('first'); // Still initial

      // Wait for full delay from the last update ('third')
      act(() => {
        vi.advanceTimersByTime(200); // Total 300ms from 'third' update
      });
      expect(result.current).toBe('third'); // Only last value fires
    });

    it('should handle multiple rapid updates and only apply last value', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 300),
        { initialProps: { value: 'v1' } }
      );

      // Simulate rapid typing
      rerender({ value: 'v2' });
      act(() => {
        vi.advanceTimersByTime(50);
      });

      rerender({ value: 'v3' });
      act(() => {
        vi.advanceTimersByTime(50);
      });

      rerender({ value: 'v4' });
      act(() => {
        vi.advanceTimersByTime(50);
      });

      rerender({ value: 'v5' });
      act(() => {
        vi.advanceTimersByTime(50);
      });

      // Still original value after 200ms total
      expect(result.current).toBe('v1');

      // Wait for full delay from last update
      act(() => {
        vi.advanceTimersByTime(250); // Total 300ms from v5
      });
      expect(result.current).toBe('v5');
    });

    it('should reset timer when delay changes', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: 'initial', delay: 300 } }
      );

      rerender({ value: 'updated', delay: 300 });
      act(() => {
        vi.advanceTimersByTime(200);
      });

      // Change delay mid-countdown
      rerender({ value: 'updated', delay: 500 });
      act(() => {
        vi.advanceTimersByTime(100); // Total 300ms from original, but delay changed
      });

      expect(result.current).toBe('initial'); // Not updated yet

      act(() => {
        vi.advanceTimersByTime(400); // Total 500ms from delay change
      });
      expect(result.current).toBe('updated');
    });
  });

  describe('Cleanup behavior', () => {
    it('TC-DEB-005: should cleanup timeout on unmount', () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

      const { unmount, rerender } = renderHook(
        ({ value }) => useDebounce(value, 300),
        { initialProps: { value: 'initial' } }
      );

      rerender({ value: 'updated' });
      unmount();

      expect(clearTimeoutSpy).toHaveBeenCalled();
    });

    it('should not update value after unmount', () => {
      const { result, rerender, unmount } = renderHook(
        ({ value }) => useDebounce(value, 300),
        { initialProps: { value: 'initial' } }
      );

      rerender({ value: 'updated' });
      unmount();

      vi.advanceTimersByTime(300);
      // Value should remain 'initial' since component unmounted
      expect(result.current).toBe('initial');
    });
  });

  describe('Type safety and generic types', () => {
    it('TC-DEB-007: should work with string type', () => {
      const { result } = renderHook(() => useDebounce('text', 300));
      expect(result.current).toBe('text');
      expect(typeof result.current).toBe('string');
    });

    it('should work with number type', () => {
      const { result } = renderHook(() => useDebounce(42, 300));
      expect(result.current).toBe(42);
      expect(typeof result.current).toBe('number');
    });

    it('should work with boolean type', () => {
      const { result } = renderHook(() => useDebounce(true, 300));
      expect(result.current).toBe(true);
      expect(typeof result.current).toBe('boolean');
    });

    it('should work with object type', () => {
      const obj = { key: 'value', nested: { data: 123 } };
      const { result } = renderHook(() => useDebounce(obj, 300));
      expect(result.current).toBe(obj);
      expect(result.current).toEqual({ key: 'value', nested: { data: 123 } });
    });

    it('should work with array type', () => {
      const arr = [1, 2, 3, 4, 5];
      const { result } = renderHook(() => useDebounce(arr, 300));
      expect(result.current).toBe(arr);
      expect(result.current).toEqual([1, 2, 3, 4, 5]);
    });

    it('should work with null type', () => {
      const { result } = renderHook(() => useDebounce(null, 300));
      expect(result.current).toBeNull();
    });

    it('should work with undefined type', () => {
      const { result } = renderHook(() => useDebounce(undefined, 300));
      expect(result.current).toBeUndefined();
    });
  });

  describe('Real-world use cases', () => {
    it('should simulate search input debouncing', () => {
      const { result, rerender } = renderHook(
        ({ query }) => useDebounce(query, 300),
        { initialProps: { query: '' } }
      );

      // User starts typing
      expect(result.current).toBe('');

      rerender({ query: 'r' });
      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(result.current).toBe(''); // Still empty

      rerender({ query: 're' });
      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(result.current).toBe(''); // Still empty

      rerender({ query: 'rea' });
      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(result.current).toBe(''); // Still empty

      rerender({ query: 'react' });
      act(() => {
        vi.advanceTimersByTime(300);
      });
      expect(result.current).toBe('react'); // Now updated after user stops typing
    });

    it('should simulate window resize debouncing', () => {
      const { result, rerender } = renderHook(
        ({ width }) => useDebounce(width, 150),
        { initialProps: { width: 1024 } }
      );

      expect(result.current).toBe(1024);

      // Simulate rapid resize events
      rerender({ width: 1020 });
      act(() => {
        vi.advanceTimersByTime(50);
      });
      rerender({ width: 1015 });
      act(() => {
        vi.advanceTimersByTime(50);
      });
      rerender({ width: 1010 });
      act(() => {
        vi.advanceTimersByTime(50);
      });

      expect(result.current).toBe(1024); // Still original

      act(() => {
        vi.advanceTimersByTime(100); // Wait for debounce
      });
      expect(result.current).toBe(1010); // Updated to last value
    });

    it('should handle empty string to non-empty transitions', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 300),
        { initialProps: { value: '' } }
      );

      expect(result.current).toBe('');

      rerender({ value: 'search query' });
      act(() => {
        vi.advanceTimersByTime(300);
      });
      expect(result.current).toBe('search query');

      // Clear search
      rerender({ value: '' });
      act(() => {
        vi.advanceTimersByTime(300);
      });
      expect(result.current).toBe('');
    });
  });

  describe('Edge cases', () => {
    it('should handle value changing from truthy to falsy', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 300),
        { initialProps: { value: 'text' } }
      );

      rerender({ value: '' });
      act(() => {
        vi.advanceTimersByTime(300);
      });
      expect(result.current).toBe('');
    });

    it('should handle value changing from falsy to truthy', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 300),
        { initialProps: { value: '' } }
      );

      rerender({ value: 'text' });
      act(() => {
        vi.advanceTimersByTime(300);
      });
      expect(result.current).toBe('text');
    });

    it('should handle same value updates', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 300),
        { initialProps: { value: 'same' } }
      );

      expect(result.current).toBe('same');

      // Update with same value
      rerender({ value: 'same' });
      act(() => {
        vi.advanceTimersByTime(300);
      });
      expect(result.current).toBe('same');
    });

    it('should handle object reference changes', () => {
      const obj1 = { id: 1 };
      const obj2 = { id: 1 }; // Same content, different reference

      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 300),
        { initialProps: { value: obj1 } }
      );

      expect(result.current).toBe(obj1);

      rerender({ value: obj2 });
      act(() => {
        vi.advanceTimersByTime(300);
      });
      expect(result.current).toBe(obj2);
      expect(result.current).not.toBe(obj1); // Different reference
    });

    it('should handle negative delay gracefully', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, -100),
        { initialProps: { value: 'initial' } }
      );

      rerender({ value: 'updated' });
      act(() => {
        vi.advanceTimersByTime(0);
      });
      expect(result.current).toBe('updated'); // Negative delay treated as immediate
    });
  });
});