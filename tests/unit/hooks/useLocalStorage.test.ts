/**
 * Unit Tests for useLocalStorage Hook
 *
 * Tests the localStorage synchronization behavior of the useLocalStorage custom React hook.
 *
 * Business Rules:
 * - Returns initial value on first render if no stored value exists
 * - Automatically serializes/deserializes values to/from JSON
 * - Falls back to in-memory storage when localStorage is unavailable
 * - SSR safe (checks if window/localStorage exists)
 * - Syncs changes across browser tabs via storage events
 * - Supports onChange callback for side effects
 * - Handles setter functions for computed updates
 * - Logs errors gracefully without crashing
 *
 * Coverage Target: 100%
 * Test Count: ~25-30 tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLocalStorage } from '@/components/hooks/useLocalStorage';
import { log } from '@/lib/services/logger.client';

// Mock logger to prevent console noise during tests
vi.mock('@/lib/services/logger.client', () => ({
  log: {
    error: vi.fn(),
  },
}));

describe('useLocalStorage', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    // Clear all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial value behavior', () => {
    it('TC-LS-001: should return initial value when no stored value exists', () => {
      const { result } = renderHook(() => useLocalStorage('test-key', 'initial'));
      expect(result.current[0]).toBe('initial');
    });

    it('should return initial value for number type', () => {
      const { result } = renderHook(() => useLocalStorage('test-number', 42));
      expect(result.current[0]).toBe(42);
    });

    it('should return initial value for boolean type', () => {
      const { result } = renderHook(() => useLocalStorage('test-boolean', true));
      expect(result.current[0]).toBe(true);
    });

    it('should return initial value for object type', () => {
      const initialObj = { name: 'Test', count: 10 };
      const { result } = renderHook(() => useLocalStorage('test-object', initialObj));
      expect(result.current[0]).toEqual(initialObj);
    });

    it('should return initial value for array type', () => {
      const initialArray = [1, 2, 3, 4, 5];
      const { result } = renderHook(() => useLocalStorage('test-array', initialArray));
      expect(result.current[0]).toEqual(initialArray);
    });

    it('should return initial value for null type', () => {
      const { result } = renderHook(() => useLocalStorage('test-null', null));
      expect(result.current[0]).toBeNull();
    });
  });

  describe('Reading from localStorage', () => {
    it('TC-LS-002: should read existing value from localStorage', () => {
      localStorage.setItem('existing-key', JSON.stringify('stored-value'));
      const { result } = renderHook(() => useLocalStorage('existing-key', 'initial'));
      expect(result.current[0]).toBe('stored-value');
    });

    it('should read complex object from localStorage', () => {
      const storedObject = { id: 123, name: 'Test User', active: true };
      localStorage.setItem('user-data', JSON.stringify(storedObject));
      const { result } = renderHook(() => useLocalStorage('user-data', {}));
      expect(result.current[0]).toEqual(storedObject);
    });

    it('should read array from localStorage', () => {
      const storedArray = ['apple', 'banana', 'cherry'];
      localStorage.setItem('fruits', JSON.stringify(storedArray));
      const { result } = renderHook(() => useLocalStorage('fruits', []));
      expect(result.current[0]).toEqual(storedArray);
    });

    it('should handle corrupted JSON in localStorage gracefully', () => {
      localStorage.setItem('corrupted-key', 'not valid json {]');
      const { result } = renderHook(() => useLocalStorage('corrupted-key', 'fallback'));
      expect(result.current[0]).toBe('fallback');
    });
  });

  describe('Writing to localStorage', () => {
    it('TC-LS-003: should write value to localStorage', () => {
      const { result } = renderHook(() => useLocalStorage('write-key', 'initial'));

      act(() => {
        result.current[1]('updated');
      });

      expect(result.current[0]).toBe('updated');
      expect(localStorage.getItem('write-key')).toBe(JSON.stringify('updated'));
    });

    it('should write object to localStorage', () => {
      const { result } = renderHook(() => useLocalStorage('write-object', { count: 0 }));

      act(() => {
        result.current[1]({ count: 5 });
      });

      expect(result.current[0]).toEqual({ count: 5 });
      expect(localStorage.getItem('write-object')).toBe(JSON.stringify({ count: 5 }));
    });

    it('should write array to localStorage', () => {
      const { result } = renderHook(() => useLocalStorage<number[]>('write-array', []));

      act(() => {
        result.current[1]([1, 2, 3]);
      });

      expect(result.current[0]).toEqual([1, 2, 3]);
      expect(localStorage.getItem('write-array')).toBe(JSON.stringify([1, 2, 3]));
    });

    it('TC-LS-004: should support functional updates', () => {
      const { result } = renderHook(() => useLocalStorage('counter', 0));

      act(() => {
        result.current[1]((prev) => prev + 1);
      });

      expect(result.current[0]).toBe(1);

      act(() => {
        result.current[1]((prev) => prev + 10);
      });

      expect(result.current[0]).toBe(11);
    });

    it('should support functional updates with objects', () => {
      const { result } = renderHook(() => useLocalStorage('user', { name: 'John', age: 25 }));

      act(() => {
        result.current[1]((prev) => ({ ...prev, age: 26 }));
      });

      expect(result.current[0]).toEqual({ name: 'John', age: 26 });
    });
  });

  describe('onChange callback', () => {
    it('TC-LS-005: should call onChange callback when value updates', () => {
      const onChangeMock = vi.fn();
      const { result } = renderHook(() =>
        useLocalStorage<string>('callback-key', 'initial', { onChange: onChangeMock })
      );

      act(() => {
        result.current[1]('updated');
      });

      expect(onChangeMock).toHaveBeenCalledWith('updated');
      expect(onChangeMock).toHaveBeenCalledTimes(1);
    });

    it('should call onChange with functional update result', () => {
      const onChangeMock = vi.fn();
      const { result } = renderHook(() =>
        useLocalStorage<number>('callback-counter', 10, { onChange: onChangeMock })
      );

      act(() => {
        result.current[1]((prev) => prev + 5);
      });

      expect(onChangeMock).toHaveBeenCalledWith(15);
    });

    it('should not call onChange on initial render', () => {
      const onChangeMock = vi.fn();
      renderHook(() => useLocalStorage('no-call-initial', 'value', { onChange: onChangeMock }));

      expect(onChangeMock).not.toHaveBeenCalled();
    });
  });

  describe('Cross-tab synchronization', () => {
    it('TC-LS-006: should sync value when storage event fires', () => {
      const { result } = renderHook(() => useLocalStorage('sync-key', 'initial'));

      expect(result.current[0]).toBe('initial');

      // Simulate storage event from another tab
      act(() => {
        const storageEvent = new StorageEvent('storage', {
          key: 'sync-key',
          newValue: JSON.stringify('updated-from-another-tab'),
          storageArea: localStorage,
        });
        window.dispatchEvent(storageEvent);
      });

      expect(result.current[0]).toBe('updated-from-another-tab');
    });

    it('should call onChange when storage event fires', () => {
      const onChangeMock = vi.fn();
      renderHook(() => useLocalStorage('sync-callback', 'initial', { onChange: onChangeMock }));

      act(() => {
        const storageEvent = new StorageEvent('storage', {
          key: 'sync-callback',
          newValue: JSON.stringify('synced-value'),
          storageArea: localStorage,
        });
        window.dispatchEvent(storageEvent);
      });

      expect(onChangeMock).toHaveBeenCalledWith('synced-value');
    });

    it('should ignore storage events for different keys', () => {
      const { result } = renderHook(() => useLocalStorage('my-key', 'my-value'));

      act(() => {
        const storageEvent = new StorageEvent('storage', {
          key: 'different-key',
          newValue: JSON.stringify('other-value'),
          storageArea: localStorage,
        });
        window.dispatchEvent(storageEvent);
      });

      expect(result.current[0]).toBe('my-value'); // Should not change
    });

    it('should handle storage events with null newValue gracefully', () => {
      const { result } = renderHook(() => useLocalStorage('nullable-key', 'initial'));

      act(() => {
        const storageEvent = new StorageEvent('storage', {
          key: 'nullable-key',
          newValue: null,
          storageArea: localStorage,
        });
        window.dispatchEvent(storageEvent);
      });

      expect(result.current[0]).toBe('initial'); // Should not change
    });

    it('should handle corrupted JSON in storage events gracefully', () => {
      const { result } = renderHook(() => useLocalStorage('corrupt-sync', 'initial'));

      act(() => {
        const storageEvent = new StorageEvent('storage', {
          key: 'corrupt-sync',
          newValue: 'invalid json {]',
          storageArea: localStorage,
        });
        window.dispatchEvent(storageEvent);
      });

      expect(result.current[0]).toBe('initial'); // Should not change
      expect(log.error).toHaveBeenCalled();
    });
  });

  describe('Cleanup behavior', () => {
    it('TC-LS-007: should cleanup storage event listener on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      const { unmount } = renderHook(() => useLocalStorage('cleanup-key', 'value'));

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('storage', expect.any(Function));
    });

    it('should not update state after unmount', () => {
      const { result, unmount } = renderHook(() => useLocalStorage('unmounted-key', 'initial'));

      unmount();

      // Simulate storage event after unmount
      act(() => {
        const storageEvent = new StorageEvent('storage', {
          key: 'unmounted-key',
          newValue: JSON.stringify('should-not-update'),
          storageArea: localStorage,
        });
        window.dispatchEvent(storageEvent);
      });

      // Value should remain initial since component is unmounted
      expect(result.current[0]).toBe('initial');
    });
  });

  describe('Error handling', () => {
    it('TC-LS-008: should handle localStorage.setItem errors gracefully', () => {
      // Mock setItem to throw after initialization check passes
      let callCount = 0;
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key) => {
        callCount++;
        // Allow the localStorage availability test to pass
        if (key === '__localStorage_test__') {
          return;
        }
        // Throw error for actual storage operations
        throw new Error('Storage full');
      });

      const { result } = renderHook(() => useLocalStorage('error-key', 'initial'));

      act(() => {
        result.current[1]('new-value');
      });

      // State should still update even if localStorage fails
      expect(result.current[0]).toBe('new-value');
      expect(log.error).toHaveBeenCalledWith(
        'useLocalStorage write error',
        expect.objectContaining({
          key: 'error-key',
        })
      );

      setItemSpy.mockRestore();
    });

    it('should handle localStorage.getItem errors gracefully', () => {
      const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('Read error');
      });

      const { result } = renderHook(() => useLocalStorage('read-error-key', 'fallback'));

      expect(result.current[0]).toBe('fallback');
      expect(log.error).toHaveBeenCalledWith(
        'useLocalStorage read error',
        expect.objectContaining({
          key: 'read-error-key',
        })
      );

      getItemSpy.mockRestore();
    });
  });

  describe('Fallback storage (when localStorage unavailable)', () => {
    it('TC-LS-009: should use in-memory fallback when localStorage is unavailable', () => {
      // Mock localStorage availability check to return false
      const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('localStorage not available');
      });
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('localStorage not available');
      });

      const { result } = renderHook(() => useLocalStorage('fallback-key', 'initial'));

      expect(result.current[0]).toBe('initial');

      // Should still work with fallback storage
      act(() => {
        result.current[1]('updated');
      });

      expect(result.current[0]).toBe('updated');

      getItemSpy.mockRestore();
      setItemSpy.mockRestore();
    });
  });

  describe('Type safety and generic types', () => {
    it('TC-LS-010: should work with string type', () => {
      const { result } = renderHook(() => useLocalStorage('string-type', 'text'));
      expect(result.current[0]).toBe('text');
      expect(typeof result.current[0]).toBe('string');
    });

    it('should work with number type', () => {
      const { result } = renderHook(() => useLocalStorage('number-type', 42));
      expect(result.current[0]).toBe(42);
      expect(typeof result.current[0]).toBe('number');
    });

    it('should work with boolean type', () => {
      const { result } = renderHook(() => useLocalStorage('boolean-type', false));
      expect(result.current[0]).toBe(false);
      expect(typeof result.current[0]).toBe('boolean');
    });

    it('should work with complex object type', () => {
      interface User {
        id: number;
        name: string;
        settings: {
          theme: string;
          notifications: boolean;
        };
      }

      const user: User = {
        id: 1,
        name: 'Test User',
        settings: {
          theme: 'dark',
          notifications: true,
        },
      };

      const { result } = renderHook(() => useLocalStorage<User>('user-type', user));
      expect(result.current[0]).toEqual(user);
    });

    it('should work with array of objects type', () => {
      type Item = { id: number; name: string };
      const items: Item[] = [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' },
      ];

      const { result } = renderHook(() => useLocalStorage<Item[]>('items-type', items));
      expect(result.current[0]).toEqual(items);
    });
  });

  describe('Real-world use cases', () => {
    it('should handle theme persistence', () => {
      const { result } = renderHook(() => useLocalStorage('theme', 'light'));

      expect(result.current[0]).toBe('light');

      act(() => {
        result.current[1]('dark');
      });

      expect(result.current[0]).toBe('dark');
      expect(localStorage.getItem('theme')).toBe(JSON.stringify('dark'));
    });

    it('should handle user preferences with onChange', () => {
      const applyPreferences = vi.fn();
      const { result } = renderHook(() =>
        useLocalStorage(
          'preferences',
          { fontSize: 16, language: 'en' },
          { onChange: applyPreferences }
        )
      );

      act(() => {
        result.current[1]({ fontSize: 18, language: 'pl' });
      });

      expect(applyPreferences).toHaveBeenCalledWith({ fontSize: 18, language: 'pl' });
    });

    it('should handle shopping cart state', () => {
      type CartItem = { id: string; quantity: number };
      const { result } = renderHook(() => useLocalStorage<CartItem[]>('cart', []));

      expect(result.current[0]).toEqual([]);

      act(() => {
        result.current[1]([
          { id: 'item-1', quantity: 2 },
          { id: 'item-2', quantity: 1 },
        ]);
      });

      expect(result.current[0]).toHaveLength(2);

      act(() => {
        result.current[1]((prev) => [...prev, { id: 'item-3', quantity: 3 }]);
      });

      expect(result.current[0]).toHaveLength(3);
    });

    it('should handle form draft autosave', () => {
      const { result } = renderHook(() =>
        useLocalStorage('form-draft', { title: '', content: '' })
      );

      // Simulate user typing
      act(() => {
        result.current[1]((prev) => ({ ...prev, title: 'Draft Title' }));
      });

      expect(result.current[0].title).toBe('Draft Title');

      act(() => {
        result.current[1]((prev) => ({ ...prev, content: 'Draft content...' }));
      });

      expect(result.current[0]).toEqual({
        title: 'Draft Title',
        content: 'Draft content...',
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle empty string as value', () => {
      const { result } = renderHook(() => useLocalStorage('empty-string', 'initial'));

      act(() => {
        result.current[1]('');
      });

      expect(result.current[0]).toBe('');
      expect(localStorage.getItem('empty-string')).toBe(JSON.stringify(''));
    });

    it('should handle zero as value', () => {
      const { result } = renderHook(() => useLocalStorage('zero-value', 10));

      act(() => {
        result.current[1](0);
      });

      expect(result.current[0]).toBe(0);
    });

    it('should handle false as value', () => {
      const { result } = renderHook(() => useLocalStorage('false-value', true));

      act(() => {
        result.current[1](false);
      });

      expect(result.current[0]).toBe(false);
    });

    it('should handle setting same value multiple times', () => {
      const onChangeMock = vi.fn();
      const { result } = renderHook(() =>
        useLocalStorage('same-value', 'value', { onChange: onChangeMock })
      );

      act(() => {
        result.current[1]('value');
      });

      act(() => {
        result.current[1]('value');
      });

      expect(result.current[0]).toBe('value');
      expect(onChangeMock).toHaveBeenCalledTimes(2); // Should still be called each time
    });

    it('should handle rapid successive updates', () => {
      const { result } = renderHook(() => useLocalStorage('rapid-updates', 0));

      act(() => {
        result.current[1](1);
        result.current[1](2);
        result.current[1](3);
        result.current[1](4);
        result.current[1](5);
      });

      expect(result.current[0]).toBe(5);
      expect(localStorage.getItem('rapid-updates')).toBe(JSON.stringify(5));
    });
  });
});