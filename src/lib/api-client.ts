/**
 * Centralized API client with error handling, retry logic, and type safety
 * Follows shared error handling best practices
 */

export interface ApiErrorResponse {
  error?: string;
  message?: string;
  details?: Record<string, string>;
  code?: string;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public message: string,
    public details?: Record<string, string>,
    public code?: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * User-friendly error messages based on status code and context
 */
export function getUserFriendlyErrorMessage(error: ApiError | Error): string {
  if (error instanceof ApiError) {
    switch (error.status) {
      case 400:
        return "Nieprawidłowe dane. Sprawdź swoje wejście.";
      case 401:
        return "Sesja wygasła. Zaloguj się ponownie.";
      case 403:
        return "Nie masz dostępu do tego zasobu.";
      case 404:
        return "Zasób nie znaleziony.";
      case 409:
        return error.message || "Konflikt danych. Spróbuj ponownie.";
      case 422:
        return "Błąd walidacji. Sprawdź swoje dane.";
      case 429:
        return "Zbyt wiele żądań. Czekaj chwilę i spróbuj ponownie.";
      case 500:
        return "Błąd serwera. Spróbuj ponownie później.";
      case 503:
        return "Serwer jest niedostępny. Spróbuj ponownie później.";
      default:
        return error.message || "Coś poszło nie tak. Spróbuj ponownie.";
    }
  }

  return error.message || "Nieznany błąd. Spróbuj ponownie.";
}

/**
 * Extract field-specific validation errors from API response
 */
export function extractValidationErrors(error: ApiError): Record<string, string> {
  if (error.status === 400 || error.status === 422) {
    return error.details || {};
  }
  return {};
}

/**
 * Fetch wrapper with centralized error handling
 */
export async function apiFetch<T = unknown>(url: string, options: RequestInit = {}): Promise<T> {
  try {
    const response = await globalThis.fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      credentials: "include", // Send cookies (including sb_session) with requests
      ...options,
    });

    // Handle non-OK responses
    if (!response.ok) {
      let errorData: ApiErrorResponse = {};
      try {
        errorData = await response.json();
      } catch {
        // JSON parse failed, use generic error
      }

      const message = errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`;

      throw new ApiError(response.status, message, errorData.details, errorData.code);
    }

    // Parse successful response
    const data: T = await response.json();
    return data;
  } catch (error) {
    // Re-throw ApiErrors as-is
    if (error instanceof ApiError) {
      throw error;
    }

    // Convert network/parse errors
    if (error instanceof TypeError) {
      const message = error.message.includes("fetch")
        ? "Brak połączenia internetowego. Sprawdź swoją sieć."
        : "Błąd przetwarzania danych.";
      throw new ApiError(0, message);
    }

    // Unknown error
    throw new ApiError(0, "Nieznany błąd. Spróbuj ponownie.", undefined, "UNKNOWN_ERROR");
  }
}

/**
 * Check if error is recoverable (retry-able)
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof ApiError) {
    // Don't retry client errors (4xx) except 429 (rate limit)
    if (error.status >= 400 && error.status < 500) {
      return error.status === 429;
    }
    // Retry server errors (5xx) and network errors
    return error.status >= 500 || error.status === 0;
  }
  return false;
}

/**
 * Check if user should be redirected to login
 */
export function shouldRedirectToLogin(error: unknown): boolean {
  if (error instanceof ApiError) {
    return error.status === 401;
  }
  return false;
}

/**
 * Log error safely (no sensitive data)
 */
export function logError(context: string, error: unknown): void {
  if (error instanceof ApiError) {
    console.error(`[${context}] API Error ${error.status}:`, error.message);
    if (error.code) {
      console.error(`Code: ${error.code}`);
    }
  } else if (error instanceof Error) {
    console.error(`[${context}] Error:`, error.message);
  } else {
    console.error(`[${context}] Unknown error:`, error);
  }
}
