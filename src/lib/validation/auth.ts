import { z } from "zod";
import { CommonValidation } from "./schemas";

/**
 * Authentication-specific validation schemas.
 * Used for login, registration, and auth-related forms.
 */

// ============= LOGIN VALIDATION =============

export const loginSchema = z.object({
  email: CommonValidation.email,
  password: CommonValidation.password,
});

export type LoginFormData = z.infer<typeof loginSchema>;

// ============= REGISTRATION VALIDATION =============

export const registrationSchema = z
  .object({
    email: CommonValidation.email,
    password: CommonValidation.password,
    confirmPassword: z.string().min(1, "Potwierdzenie hasła jest wymagane"),
    agreeToPasswordLimitation: z.boolean().refine((val) => val === true, {
      message: "Musisz zaakceptować warunki",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Hasła nie są identyczne",
    path: ["confirmPassword"],
  });

export type RegistrationFormData = z.infer<typeof registrationSchema>;

// ============= PASSWORD RESET VALIDATION =============

export const passwordResetSchema = z.object({
  email: CommonValidation.email,
});

export type PasswordResetData = z.infer<typeof passwordResetSchema>;

// ============= PASSWORD UPDATE VALIDATION =============

export const passwordUpdateSchema = z
  .object({
    currentPassword: z.string().min(1, "Obecne hasło jest wymagane"),
    newPassword: CommonValidation.password,
    confirmPassword: z.string().min(1, "Potwierdzenie hasła jest wymagane"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Nowe hasła nie są identyczne",
    path: ["confirmPassword"],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "Nowe hasło musi być różne od obecnego",
    path: ["newPassword"],
  });

export type PasswordUpdateData = z.infer<typeof passwordUpdateSchema>;

// ============= PROFILE UPDATE VALIDATION =============

export const profileUpdateSchema = z.object({
  full_name: z
    .string()
    .max(255, "Imię i nazwisko nie może być dłuższe niż 255 znaków")
    .optional()
    .nullable(),
  avatar_url: z
    .string()
    .url("Nieprawidłowy URL avatara")
    .optional()
    .nullable(),
});

export type ProfileUpdateData = z.infer<typeof profileUpdateSchema>;
