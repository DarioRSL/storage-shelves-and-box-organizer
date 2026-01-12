/**
 * Unit Tests for useAuthForm Hook
 *
 * Tests the authentication form management behavior of the useAuthForm custom React hook.
 *
 * Business Rules:
 * - Supports both login and registration flows
 * - Creates Supabase client from environment variables
 * - Validates Supabase config presence (PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY)
 * - Handles authentication via Supabase signInWithPassword/signUp
 * - Fetches user profile after successful authentication
 * - Fetches user workspace after successful authentication
 * - Returns access_token and refresh_token on success
 * - Provides Polish error messages for common auth errors
 * - Tracks loading state during authentication operations
 * - Manages error state with clearError functionality
 * - Invokes onSuccess callback with user, workspace, and tokens
 * - Invokes onError callback with error message
 * - Handles missing session/user after authentication
 * - Handles missing profile/workspace data
 *
 * Coverage Target: 80-90%
 * Test Count: 16 tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAuthForm } from '@/components/hooks/useAuthForm';
import { createClient } from '@supabase/supabase-js';
import type { ProfileDto, WorkspaceDto } from '@/types';

// Mock dependencies
vi.mock('@supabase/supabase-js');
vi.mock('@/lib/services/logger.client');

describe('useAuthForm', () => {
  // Mock data
  const mockProfile: ProfileDto = {
    id: 'user-123',
    email: 'test@example.com',
    full_name: 'Test User',
    avatar_url: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  const mockWorkspace: WorkspaceDto = {
    id: 'workspace-123',
    name: 'My Workspace',
    owner_id: 'user-123',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  const mockSession = {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    expires_in: 3600,
    token_type: 'bearer',
    user: {
      id: 'user-123',
      email: 'test@example.com',
    },
  };

  // Mock Supabase client methods
  const mockSignInWithPassword = vi.fn();
  const mockSignUp = vi.fn();
  const mockFrom = vi.fn();
  const mockSelect = vi.fn();
  const mockEq = vi.fn();
  const mockLimit = vi.fn();
  const mockSingle = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Set up environment variables
    vi.stubGlobal('import.meta', {
      env: {
        PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
        PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
      },
    });

    // Set up Supabase client mock
    const mockSupabaseClient = {
      auth: {
        signInWithPassword: mockSignInWithPassword,
        signUp: mockSignUp,
      },
      from: mockFrom,
    };

    (createClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabaseClient);

    // Set up default query chain
    mockFrom.mockReturnValue({ select: mockSelect });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ limit: mockLimit, single: mockSingle });
    mockLimit.mockReturnValue({ single: mockSingle });
    mockSingle.mockResolvedValue({ data: null, error: null });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('Hook Initialization', () => {
    it('TC-AUTH-FORM-001: should initialize with default state', () => {
      const { result } = renderHook(() => useAuthForm());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.clearError).toBeInstanceOf(Function);
      expect(result.current.submitLogin).toBeInstanceOf(Function);
      expect(result.current.submitRegistration).toBeInstanceOf(Function);
    });

    it('TC-AUTH-FORM-002: should accept options with callbacks', () => {
      const onSuccess = vi.fn();
      const onError = vi.fn();

      const { result } = renderHook(() => useAuthForm({ onSuccess, onError }));

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
    });
  });

  describe('clearError Functionality', () => {
    it('TC-AUTH-FORM-003: should clear error state when clearError is called', async () => {
      const { result } = renderHook(() => useAuthForm());

      // Trigger an error by missing Supabase config
      vi.stubGlobal('import.meta', {
        env: {
          PUBLIC_SUPABASE_URL: '',
          PUBLIC_SUPABASE_ANON_KEY: '',
        },
      });

      await act(async () => {
        try {
          await result.current.submitLogin({ email: 'test@example.com', password: 'password' });
        } catch {
          // Expected to throw
        }
      });

      expect(result.current.error).toBeTruthy();

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBe(null);
    });
  });

  describe('Login Flow - Success', () => {
    it('TC-AUTH-FORM-004: should successfully login with valid credentials', async () => {
      const onSuccess = vi.fn();
      const { result } = renderHook(() => useAuthForm({ onSuccess }));

      // Mock successful authentication
      mockSignInWithPassword.mockResolvedValueOnce({
        data: {
          session: mockSession,
          user: mockSession.user,
        },
        error: null,
      });

      // Mock profile fetch
      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockProfile,
              error: null,
            }),
          }),
        }),
      });

      // Mock workspace fetch
      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { workspaces: mockWorkspace },
                error: null,
              }),
            }),
          }),
        }),
      });

      await act(async () => {
        await result.current.submitLogin({
          email: 'test@example.com',
          password: 'password123',
        });
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(onSuccess).toHaveBeenCalledWith({
        user: mockProfile,
        workspace: mockWorkspace,
        token: mockSession.access_token,
        refreshToken: mockSession.refresh_token,
      });
    });

    it('TC-AUTH-FORM-005: should create Supabase client with correct config', async () => {
      const { result } = renderHook(() => useAuthForm());

      mockSignInWithPassword.mockResolvedValueOnce({
        data: { session: mockSession, user: mockSession.user },
        error: null,
      });

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
            limit: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { workspaces: mockWorkspace }, error: null }),
            }),
          }),
        }),
      });

      await act(async () => {
        await result.current.submitLogin({
          email: 'test@example.com',
          password: 'password123',
        });
      });

      expect(createClient).toHaveBeenCalledWith(
        'https://test.supabase.co',
        'test-anon-key'
      );
    });
  });

  describe('Login Flow - Error Handling', () => {
    it('TC-AUTH-FORM-006: should handle invalid credentials error', async () => {
      const onError = vi.fn();
      const { result } = renderHook(() => useAuthForm({ onError }));

      mockSignInWithPassword.mockResolvedValueOnce({
        data: { session: null, user: null },
        error: { message: 'Invalid login credentials' },
      });

      await act(async () => {
        await result.current.submitLogin({
          email: 'wrong@example.com',
          password: 'wrongpassword',
        });
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('Nieprawidłowy email lub hasło');
      expect(onError).toHaveBeenCalledWith('Nieprawidłowy email lub hasło');
    });

    it('TC-AUTH-FORM-007: should handle generic authentication errors', async () => {
      const onError = vi.fn();
      const { result } = renderHook(() => useAuthForm({ onError }));

      mockSignInWithPassword.mockResolvedValueOnce({
        data: { session: null, user: null },
        error: { message: 'Generic auth error' },
      });

      await act(async () => {
        await result.current.submitLogin({
          email: 'test@example.com',
          password: 'password123',
        });
      });

      expect(result.current.error).toBe('Błąd logowania. Spróbuj ponownie.');
      expect(onError).toHaveBeenCalledWith('Błąd logowania. Spróbuj ponownie.');
    });

    it('TC-AUTH-FORM-008: should handle missing session after authentication', async () => {
      const { result } = renderHook(() => useAuthForm());

      mockSignInWithPassword.mockResolvedValueOnce({
        data: { session: null, user: null },
        error: null,
      });

      await act(async () => {
        await result.current.submitLogin({
          email: 'test@example.com',
          password: 'password123',
        });
      });

      expect(result.current.error).toBe('Błąd uwierzytelniania. Spróbuj ponownie.');
    });

    it('TC-AUTH-FORM-009: should handle profile fetch error', async () => {
      const { result } = renderHook(() => useAuthForm());

      mockSignInWithPassword.mockResolvedValueOnce({
        data: { session: mockSession, user: mockSession.user },
        error: null,
      });

      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Profile not found' },
            }),
          }),
        }),
      });

      await act(async () => {
        await result.current.submitLogin({
          email: 'test@example.com',
          password: 'password123',
        });
      });

      expect(result.current.error).toBe('Nie udało się pobrać profilu użytkownika');
    });

    it('TC-AUTH-FORM-010: should handle workspace fetch error', async () => {
      const { result } = renderHook(() => useAuthForm());

      mockSignInWithPassword.mockResolvedValueOnce({
        data: { session: mockSession, user: mockSession.user },
        error: null,
      });

      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockProfile,
              error: null,
            }),
          }),
        }),
      });

      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Workspace not found' },
              }),
            }),
          }),
        }),
      });

      await act(async () => {
        await result.current.submitLogin({
          email: 'test@example.com',
          password: 'password123',
        });
      });

      expect(result.current.error).toBe('Nie udało się pobrać workspace');
    });

    it('TC-AUTH-FORM-011: should handle missing workspace data', async () => {
      const { result } = renderHook(() => useAuthForm());

      mockSignInWithPassword.mockResolvedValueOnce({
        data: { session: mockSession, user: mockSession.user },
        error: null,
      });

      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockProfile,
              error: null,
            }),
          }),
        }),
      });

      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { workspaces: null },
                error: null,
              }),
            }),
          }),
        }),
      });

      await act(async () => {
        await result.current.submitLogin({
          email: 'test@example.com',
          password: 'password123',
        });
      });

      expect(result.current.error).toBe('Nie znaleziono workspace dla użytkownika');
    });
  });

  describe('Registration Flow - Success', () => {
    it('TC-AUTH-FORM-012: should successfully register a new user', async () => {
      const onSuccess = vi.fn();
      const { result } = renderHook(() => useAuthForm({ onSuccess }));

      mockSignUp.mockResolvedValueOnce({
        data: {
          session: mockSession,
          user: mockSession.user,
        },
        error: null,
      });

      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockProfile,
              error: null,
            }),
          }),
        }),
      });

      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { workspaces: mockWorkspace },
                error: null,
              }),
            }),
          }),
        }),
      });

      await act(async () => {
        await result.current.submitRegistration({
          email: 'newuser@example.com',
          password: 'password123',
          confirmPassword: 'password123',
          agreeToPasswordLimitation: true,
        });
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(onSuccess).toHaveBeenCalledWith({
        user: mockProfile,
        workspace: mockWorkspace,
        token: mockSession.access_token,
        refreshToken: mockSession.refresh_token,
      });
    });
  });

  describe('Registration Flow - Error Handling', () => {
    it('TC-AUTH-FORM-013: should handle email already exists error', async () => {
      const onError = vi.fn();
      const { result } = renderHook(() => useAuthForm({ onError }));

      mockSignUp.mockResolvedValueOnce({
        data: { session: null, user: null },
        error: { message: 'User already exists' },
      });

      await act(async () => {
        await result.current.submitRegistration({
          email: 'existing@example.com',
          password: 'password123',
          confirmPassword: 'password123',
          agreeToPasswordLimitation: true,
        });
      });

      expect(result.current.error).toBe('Email jest już zarejestrowany');
      expect(onError).toHaveBeenCalledWith('Email jest już zarejestrowany');
    });

    it('TC-AUTH-FORM-014: should handle weak password error', async () => {
      const onError = vi.fn();
      const { result } = renderHook(() => useAuthForm({ onError }));

      mockSignUp.mockResolvedValueOnce({
        data: { session: null, user: null },
        error: { message: 'Password is too weak' },
      });

      await act(async () => {
        await result.current.submitRegistration({
          email: 'test@example.com',
          password: '123',
          confirmPassword: '123',
          agreeToPasswordLimitation: true,
        });
      });

      expect(result.current.error).toBe('Hasło jest zbyt słabe');
      expect(onError).toHaveBeenCalledWith('Hasło jest zbyt słabe');
    });

    it('TC-AUTH-FORM-015: should handle profile fetch error during registration', async () => {
      const { result } = renderHook(() => useAuthForm());

      mockSignUp.mockResolvedValueOnce({
        data: { session: mockSession, user: mockSession.user },
        error: null,
      });

      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Profile not found' },
            }),
          }),
        }),
      });

      await act(async () => {
        await result.current.submitRegistration({
          email: 'test@example.com',
          password: 'password123',
          confirmPassword: 'password123',
          agreeToPasswordLimitation: true,
        });
      });

      expect(result.current.error).toBe('Błąd pobierania danych użytkownika. Spróbuj ponownie.');
    });

    it('TC-AUTH-FORM-016: should handle workspace initialization error during registration', async () => {
      const { result } = renderHook(() => useAuthForm());

      mockSignUp.mockResolvedValueOnce({
        data: { session: mockSession, user: mockSession.user },
        error: null,
      });

      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockProfile,
              error: null,
            }),
          }),
        }),
      });

      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Workspace not found' },
              }),
            }),
          }),
        }),
      });

      await act(async () => {
        await result.current.submitRegistration({
          email: 'test@example.com',
          password: 'password123',
          confirmPassword: 'password123',
          agreeToPasswordLimitation: true,
        });
      });

      expect(result.current.error).toBe('Błąd inicjalizacji konta. Spróbuj ponownie.');
    });
  });

  describe('Loading State Management', () => {
    it('should set loading state during login', async () => {
      const { result } = renderHook(() => useAuthForm());

      let resolveLogin: (value: any) => void;
      const loginPromise = new Promise((resolve) => {
        resolveLogin = resolve;
      });

      mockSignInWithPassword.mockImplementation(() => loginPromise);

      // Start login operation
      let submitPromise: Promise<void>;
      act(() => {
        submitPromise = result.current.submitLogin({
          email: 'test@example.com',
          password: 'password123',
        });
      });

      // Check loading state is true during operation
      expect(result.current.isLoading).toBe(true);

      // Resolve the login
      act(() => {
        resolveLogin!({
          data: { session: mockSession, user: mockSession.user },
          error: null,
        });
      });

      // Mock profile fetch
      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockProfile,
              error: null,
            }),
          }),
        }),
      });

      // Mock workspace fetch
      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { workspaces: mockWorkspace },
                error: null,
              }),
            }),
          }),
        }),
      });

      await act(async () => {
        await submitPromise!;
      });

      // Check loading state is false after operation
      expect(result.current.isLoading).toBe(false);
    });
  });
});
