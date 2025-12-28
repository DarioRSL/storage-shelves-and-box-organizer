import { useMemo } from "react";

/**
 * Password strength evaluation result.
 */
export interface PasswordStrengthResult {
  level: "weak" | "medium" | "strong";
  score: number; // 0-100
  feedback: string;
  hasMinLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumbers: boolean;
  hasSpecialChars: boolean;
}

const MIN_LENGTH = 8;

/**
 * Evaluate password strength based on character variety and length.
 * Returns detailed strength analysis.
 */
function evaluatePasswordStrength(password: string): PasswordStrengthResult {
  const hasMinLength = password.length >= MIN_LENGTH;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChars = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);

  // Calculate score
  let score = 0;
  if (hasMinLength) score += 20;
  if (hasLowercase) score += 20;
  if (hasUppercase) score += 20;
  if (hasNumbers) score += 20;
  if (hasSpecialChars) score += 20;

  // Determine level
  let level: "weak" | "medium" | "strong" = "weak";
  let feedback = "Słabe hasło";

  if (score >= 60) {
    level = "strong";
    feedback = "Silne hasło";
  } else if (score >= 40) {
    level = "medium";
    feedback = "Średnie hasło";
  }

  return {
    level,
    score,
    feedback,
    hasMinLength,
    hasUppercase,
    hasLowercase,
    hasNumbers,
    hasSpecialChars,
  };
}

/**
 * Hook to evaluate password strength in real-time.
 * Uses useMemo to avoid unnecessary recalculations.
 */
export function usePasswordStrength(password: string): PasswordStrengthResult {
  return useMemo(() => {
    return evaluatePasswordStrength(password);
  }, [password]);
}
