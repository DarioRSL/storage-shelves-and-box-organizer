/**
 * Custom hook for form field validation.
 * Provides reusable validation functions for login and registration forms.
 */

export interface FormValidationState {
  email: string | null;
  password: string | null;
  confirmPassword: string | null;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

/**
 * Validate email format and presence.
 * Returns error message or null if valid.
 */
export function validateEmail(email: string): string | null {
  if (!email || email.trim().length === 0) {
    return "Email jest wymagany";
  }
  if (!EMAIL_REGEX.test(email)) {
    return "Proszę wprowadzić prawidłowy adres email";
  }
  return null;
}

/**
 * Validate password meets minimum requirements.
 * Returns error message or null if valid.
 */
export function validatePassword(password: string): string | null {
  if (!password || password.length === 0) {
    return "Hasło jest wymagane";
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Hasło musi mieć co najmniej ${MIN_PASSWORD_LENGTH} znaków`;
  }
  return null;
}

/**
 * Validate password and confirmation match.
 * Returns error message or null if valid.
 */
export function validatePasswordMatch(password: string, confirmPassword: string): string | null {
  if (password !== confirmPassword) {
    return "Hasła nie są identyczne";
  }
  return null;
}

/**
 * Hook for form validation with reusable validation functions.
 */
export function useFormValidation() {
  return {
    validateEmail,
    validatePassword,
    validatePasswordMatch,
    validateLoginForm: (email: string, password: string) => ({
      email: validateEmail(email),
      password: validatePassword(password),
      confirmPassword: null,
    }),
    validateRegistrationForm: (email: string, password: string, confirmPassword: string) => ({
      email: validateEmail(email),
      password: validatePassword(password),
      confirmPassword: validatePasswordMatch(password, confirmPassword),
    }),
  };
}
