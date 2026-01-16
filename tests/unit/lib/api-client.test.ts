/**
 * Unit Tests for API Client Error Handling Functions
 *
 * Tests centralized error handling utilities for API client including error
 * message extraction, validation error parsing, and redirect logic.
 *
 * Business Rules:
 * - ApiError extends Error with status, message, details, and code
 * - getUserFriendlyErrorMessage() returns Polish messages based on status codes
 * - extractValidationErrors() returns field errors from 400/422 responses
 * - shouldRedirectToLogin() returns true only for 401 status
 * - logError() safely logs errors without exposing sensitive data
 * - Polish error messages for user-facing errors
 * - Network/timeout errors have special handling
 *
 * Coverage Target: 80-90%
 * Test Count: 14 tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ApiError,
  getUserFriendlyErrorMessage,
  extractValidationErrors,
  shouldRedirectToLogin,
  logError,
} from '@/lib/api-client';
import { log } from '@/lib/services/logger.client';

// Mock the logger module
vi.mock('@/lib/services/logger.client', () => ({
  log: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('API Client Error Handling', () => {
  beforeEach(() => {
    // Clear all mock calls before each test
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore all mocks after each test
    vi.restoreAllMocks();
  });

  describe('ApiError Class', () => {
    it('TC-API-CLIENT-001: should create ApiError with all properties', () => {
      // Arrange & Act
      const error = new ApiError(404, 'Not found', { field: 'error' }, 'NOT_FOUND');

      // Assert
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ApiError);
      expect(error.status).toBe(404);
      expect(error.message).toBe('Not found');
      expect(error.details).toEqual({ field: 'error' });
      expect(error.code).toBe('NOT_FOUND');
      expect(error.name).toBe('ApiError');
    });

    it('should create ApiError without optional properties', () => {
      // Arrange & Act
      const error = new ApiError(500, 'Internal server error');

      // Assert
      expect(error.status).toBe(500);
      expect(error.message).toBe('Internal server error');
      expect(error.details).toBeUndefined();
      expect(error.code).toBeUndefined();
    });
  });

  describe('getUserFriendlyErrorMessage()', () => {
    it('TC-API-CLIENT-002: should return Polish message for 400 Bad Request', () => {
      // Arrange
      const error = new ApiError(400, 'Bad request');

      // Act
      const message = getUserFriendlyErrorMessage(error);

      // Assert
      expect(message).toBe('Nieprawidłowe dane. Sprawdź swoje wejście.');
    });

    it('TC-API-CLIENT-003: should return Polish message for 401 Unauthorized', () => {
      // Arrange
      const error = new ApiError(401, 'Unauthorized');

      // Act
      const message = getUserFriendlyErrorMessage(error);

      // Assert
      expect(message).toBe('Sesja wygasła. Zaloguj się ponownie.');
    });

    it('TC-API-CLIENT-004: should return Polish message for 403 Forbidden', () => {
      // Arrange
      const error = new ApiError(403, 'Forbidden');

      // Act
      const message = getUserFriendlyErrorMessage(error);

      // Assert
      expect(message).toBe('Nie masz dostępu do tego zasobu.');
    });

    it('TC-API-CLIENT-005: should return Polish message for 404 Not Found', () => {
      // Arrange
      const error = new ApiError(404, 'Not found');

      // Act
      const message = getUserFriendlyErrorMessage(error);

      // Assert
      expect(message).toBe('Zasób nie znaleziony.');
    });

    it('TC-API-CLIENT-006: should return custom message for 409 Conflict if provided', () => {
      // Arrange
      const error = new ApiError(409, 'Konflikt danych niestandardowy');

      // Act
      const message = getUserFriendlyErrorMessage(error);

      // Assert
      expect(message).toBe('Konflikt danych niestandardowy');
    });

    it('TC-API-CLIENT-007: should return default conflict message for 409 if no message', () => {
      // Arrange
      const error = new ApiError(409, '');

      // Act
      const message = getUserFriendlyErrorMessage(error);

      // Assert
      expect(message).toBe('Konflikt danych. Spróbuj ponownie.');
    });

    it('TC-API-CLIENT-008: should return Polish message for 422 Validation Error', () => {
      // Arrange
      const error = new ApiError(422, 'Validation failed');

      // Act
      const message = getUserFriendlyErrorMessage(error);

      // Assert
      expect(message).toBe('Błąd walidacji. Sprawdź swoje dane.');
    });

    it('should return Polish message for 429 Rate Limit', () => {
      // Arrange
      const error = new ApiError(429, 'Too many requests');

      // Act
      const message = getUserFriendlyErrorMessage(error);

      // Assert
      expect(message).toBe('Zbyt wiele żądań. Czekaj chwilę i spróbuj ponownie.');
    });

    it('should return Polish message for 500 Internal Server Error', () => {
      // Arrange
      const error = new ApiError(500, 'Internal server error');

      // Act
      const message = getUserFriendlyErrorMessage(error);

      // Assert
      expect(message).toBe('Błąd serwera. Spróbuj ponownie później.');
    });

    it('should return Polish message for 503 Service Unavailable', () => {
      // Arrange
      const error = new ApiError(503, 'Service unavailable');

      // Act
      const message = getUserFriendlyErrorMessage(error);

      // Assert
      expect(message).toBe('Serwer jest niedostępny. Spróbuj ponownie później.');
    });

    it('TC-API-CLIENT-009: should return custom message for unknown status codes', () => {
      // Arrange
      const error = new ApiError(418, "I'm a teapot");

      // Act
      const message = getUserFriendlyErrorMessage(error);

      // Assert
      expect(message).toBe("I'm a teapot");
    });

    it('TC-API-CLIENT-010: should return generic Polish message for unknown status without message', () => {
      // Arrange
      const error = new ApiError(999, '');

      // Act
      const message = getUserFriendlyErrorMessage(error);

      // Assert
      expect(message).toBe('Coś poszło nie tak. Spróbuj ponownie.');
    });

    it('TC-API-CLIENT-011: should handle non-ApiError instances', () => {
      // Arrange
      const error = new Error('Standard error message');

      // Act
      const message = getUserFriendlyErrorMessage(error);

      // Assert
      expect(message).toBe('Standard error message');
    });

    it('TC-API-CLIENT-012: should return generic message for Error without message', () => {
      // Arrange
      const error = new Error();

      // Act
      const message = getUserFriendlyErrorMessage(error);

      // Assert
      expect(message).toBe('Nieznany błąd. Spróbuj ponownie.');
    });
  });

  describe('extractValidationErrors()', () => {
    it('TC-API-CLIENT-013: should extract validation errors from 422 response', () => {
      // Arrange
      const error = new ApiError(422, 'Validation failed', {
        email: 'Email is required',
        password: 'Password must be at least 8 characters',
      });

      // Act
      const validationErrors = extractValidationErrors(error);

      // Assert
      expect(validationErrors).toEqual({
        email: 'Email is required',
        password: 'Password must be at least 8 characters',
      });
    });

    it('TC-API-CLIENT-014: should extract validation errors from 400 response', () => {
      // Arrange
      const error = new ApiError(400, 'Bad request', {
        name: 'Name cannot be empty',
        age: 'Age must be a positive number',
      });

      // Act
      const validationErrors = extractValidationErrors(error);

      // Assert
      expect(validationErrors).toEqual({
        name: 'Name cannot be empty',
        age: 'Age must be a positive number',
      });
    });

    it('TC-API-CLIENT-015: should return empty object when no details provided', () => {
      // Arrange
      const error = new ApiError(422, 'Validation failed');

      // Act
      const validationErrors = extractValidationErrors(error);

      // Assert
      expect(validationErrors).toEqual({});
    });

    it('TC-API-CLIENT-016: should return empty object for non-validation status codes', () => {
      // Arrange
      const error = new ApiError(404, 'Not found', {
        field: 'error',
      });

      // Act
      const validationErrors = extractValidationErrors(error);

      // Assert
      expect(validationErrors).toEqual({});
    });

    it('should return empty object when details is empty', () => {
      // Arrange
      const error = new ApiError(422, 'Validation failed', {});

      // Act
      const validationErrors = extractValidationErrors(error);

      // Assert
      expect(validationErrors).toEqual({});
    });
  });

  describe('shouldRedirectToLogin()', () => {
    it('TC-API-CLIENT-017: should return true for 401 Unauthorized', () => {
      // Arrange
      const error = new ApiError(401, 'Unauthorized');

      // Act
      const shouldRedirect = shouldRedirectToLogin(error);

      // Assert
      expect(shouldRedirect).toBe(true);
    });

    it('TC-API-CLIENT-018: should return false for 403 Forbidden', () => {
      // Arrange
      const error = new ApiError(403, 'Forbidden');

      // Act
      const shouldRedirect = shouldRedirectToLogin(error);

      // Assert
      expect(shouldRedirect).toBe(false);
    });

    it('TC-API-CLIENT-019: should return false for other status codes', () => {
      // Arrange
      const testCases = [
        new ApiError(400, 'Bad request'),
        new ApiError(404, 'Not found'),
        new ApiError(500, 'Internal server error'),
        new ApiError(422, 'Validation failed'),
      ];

      // Act & Assert
      testCases.forEach((error) => {
        expect(shouldRedirectToLogin(error)).toBe(false);
      });
    });

    it('TC-API-CLIENT-020: should return false for non-ApiError instances', () => {
      // Arrange
      const error = new Error('Standard error');

      // Act
      const shouldRedirect = shouldRedirectToLogin(error);

      // Assert
      expect(shouldRedirect).toBe(false);
    });

    it('should return false for null or undefined', () => {
      // Act & Assert
      expect(shouldRedirectToLogin(null)).toBe(false);
      expect(shouldRedirectToLogin(undefined)).toBe(false);
    });
  });

  describe('logError()', () => {
    it('TC-API-CLIENT-021: should log ApiError with status, message, and code', () => {
      // Arrange
      const error = new ApiError(404, 'Not found', undefined, 'NOT_FOUND');
      const context = 'Test API Call';

      // Act
      logError(context, error);

      // Assert
      expect(log.error).toHaveBeenCalledTimes(1);
      expect(log.error).toHaveBeenCalledWith('Test API Call API Error', {
        status: 404,
        message: 'Not found',
        code: 'NOT_FOUND',
      });
    });

    it('TC-API-CLIENT-022: should log ApiError without code', () => {
      // Arrange
      const error = new ApiError(500, 'Internal server error');
      const context = 'Server Error';

      // Act
      logError(context, error);

      // Assert
      expect(log.error).toHaveBeenCalledTimes(1);
      expect(log.error).toHaveBeenCalledWith('Server Error API Error', {
        status: 500,
        message: 'Internal server error',
        code: undefined,
      });
    });

    it('TC-API-CLIENT-023: should log standard Error instances', () => {
      // Arrange
      const error = new Error('Network error');
      const context = 'Fetch Failed';

      // Act
      logError(context, error);

      // Assert
      expect(log.error).toHaveBeenCalledTimes(1);
      expect(log.error).toHaveBeenCalledWith('Fetch Failed Error', {
        message: 'Network error',
        error,
      });
    });

    it('TC-API-CLIENT-024: should log unknown error types', () => {
      // Arrange
      const error = { unknown: 'error object' };
      const context = 'Unknown Error';

      // Act
      logError(context, error);

      // Assert
      expect(log.error).toHaveBeenCalledTimes(1);
      expect(log.error).toHaveBeenCalledWith('Unknown Error Unknown error', {
        error,
      });
    });

    it('should log string errors as unknown', () => {
      // Arrange
      const error = 'String error message';
      const context = 'String Error';

      // Act
      logError(context, error);

      // Assert
      expect(log.error).toHaveBeenCalledTimes(1);
      expect(log.error).toHaveBeenCalledWith('String Error Unknown error', {
        error,
      });
    });

    it('should handle context with special characters', () => {
      // Arrange
      const error = new ApiError(422, 'Validation failed');
      const context = 'API Call: /users/{id}/update';

      // Act
      logError(context, error);

      // Assert
      expect(log.error).toHaveBeenCalledTimes(1);
      expect(log.error).toHaveBeenCalledWith('API Call: /users/{id}/update API Error', {
        status: 422,
        message: 'Validation failed',
        code: undefined,
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle ApiError with empty message for 404', () => {
      // Arrange
      const error = new ApiError(404, '');

      // Act
      const message = getUserFriendlyErrorMessage(error);

      // Assert
      expect(message).toBe('Zasób nie znaleziony.');
    });

    it('should handle multiple validation errors', () => {
      // Arrange
      const error = new ApiError(422, 'Validation failed', {
        field1: 'Error 1',
        field2: 'Error 2',
        field3: 'Error 3',
        field4: 'Error 4',
      });

      // Act
      const validationErrors = extractValidationErrors(error);

      // Assert
      expect(Object.keys(validationErrors)).toHaveLength(4);
      expect(validationErrors).toEqual({
        field1: 'Error 1',
        field2: 'Error 2',
        field3: 'Error 3',
        field4: 'Error 4',
      });
    });

    it('should return details directly from error', () => {
      // Arrange
      const originalDetails = { email: 'Invalid email' };
      const error = new ApiError(422, 'Validation failed', originalDetails);

      // Act
      const validationErrors = extractValidationErrors(error);

      // Assert
      expect(validationErrors).toEqual({ email: 'Invalid email' });
      expect(validationErrors).toBe(originalDetails); // Same reference
    });
  });
});
