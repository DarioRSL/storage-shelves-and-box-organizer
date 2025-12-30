import { z } from "zod";

/**
 * Common validation patterns used across the application.
 * Single source of truth for validation rules.
 */

// ============= COMMON PATTERNS =============

export const emailSchema = z.string().email("Nieprawidłowy format adresu email").trim().toLowerCase();

export const passwordSchema = z
  .string()
  .min(8, "Hasło musi mieć co najmniej 8 znaków")
  .max(128, "Hasło nie może być dłuższe niż 128 znaków")
  .trim();

export const nameSchema = z
  .string()
  .min(1, "Nazwa nie może być pusta")
  .max(255, "Nazwa nie może być dłuższa niż 255 znaków")
  .trim();

export const descriptionSchema = z
  .string()
  .max(10000, "Opis nie może zawierać więcej niż 10 000 znaków")
  .trim()
  .optional()
  .nullable();

export const uuidSchema = z.string().uuid("Nieprawidłowy format identyfikatora");

export const tagsSchema = z
  .array(z.string().max(50, "Tag nie może być dłuższy niż 50 znaków").trim())
  .max(10, "Maksymalna liczba tagów to 10")
  .optional()
  .nullable();

export const workspaceNameSchema = z
  .string()
  .min(1, "Nazwa workspace'a nie może być pusta")
  .max(255, "Nazwa workspace'a nie może być dłuższa niż 255 znaków")
  .trim();

export const locationNameSchema = z
  .string()
  .min(1, "Nazwa lokalizacji nie może być pusta")
  .max(255, "Nazwa lokalizacji nie może być dłuższa niż 255 znaków")
  .trim();

export const boxNameSchema = z
  .string()
  .min(1, "Nazwa pudełka nie może być pusta")
  .max(255, "Nazwa pudełka nie może być dłuższa niż 255 znaków")
  .trim();

export const qrCodeSchema = z.string().regex(/^QR-[A-Z0-9]{6}$/, "Nieprawidłowy format kodu QR");

export const searchQuerySchema = z
  .string()
  .min(3, "Zapytanie musi zawierać co najmniej 3 znaki")
  .max(255, "Zapytanie nie może być dłuższe niż 255 znaków")
  .trim()
  .optional()
  .nullable();

export const quantitySchema = z
  .number()
  .int("Ilość musi być liczbą całkowitą")
  .min(1, "Ilość musi być co najmniej 1")
  .max(1000, "Ilość nie może być większa niż 1000");

// ============= COMPOSITE EXPORT =============

export const CommonValidation = {
  email: emailSchema,
  password: passwordSchema,
  name: nameSchema,
  description: descriptionSchema,
  descriptionSchema: descriptionSchema,
  uuid: uuidSchema,
  tags: tagsSchema,
  tagsSchema: tagsSchema,
  workspaceName: workspaceNameSchema,
  locationName: locationNameSchema,
  boxName: boxNameSchema,
  qrCode: qrCodeSchema,
  searchQuery: searchQuerySchema,
  searchQuerySchema: searchQuerySchema,
  quantity: quantitySchema,
};

/**
 * Validation utility functions
 */

/**
 * Check if email is valid
 */
export function isValidEmail(email: string): boolean {
  try {
    emailSchema.parse(email);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if password meets requirements
 */
export function isValidPassword(password: string): boolean {
  try {
    passwordSchema.parse(password);
    return true;
  } catch {
    return false;
  }
}

/**
 * Evaluate password strength (for UI feedback)
 * Returns score 0-100 and level
 */
export function evaluatePasswordStrength(password: string): {
  level: "weak" | "medium" | "strong";
  score: number;
} {
  let score = 0;

  if (password.length >= 8) score += 20;
  if (password.length >= 12) score += 10;
  if (password.length >= 16) score += 10;

  if (/[a-z]/.test(password)) score += 15;
  if (/[A-Z]/.test(password)) score += 15;
  if (/[0-9]/.test(password)) score += 15;
  if (/[^a-zA-Z0-9]/.test(password)) score += 15;

  const level = score < 40 ? "weak" : score < 70 ? "medium" : "strong";
  return { level, score: Math.min(score, 100) };
}

/**
 * Validate and extract field errors from Zod error
 */
export function extractZodErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  error.errors.forEach((err) => {
    const field = err.path[0];
    if (field) {
      fieldErrors[String(field)] = err.message;
    }
  });
  return fieldErrors;
}
