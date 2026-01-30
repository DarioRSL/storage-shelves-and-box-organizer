import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/FormInput";
import { useFormValidation } from "@/components/hooks/useFormValidation";
import { useAuthForm, type AuthSuccessResponse } from "@/components/hooks/useAuthForm";
import { setAuthSuccess, setAuthError } from "@/lib/stores/auth.store";

export interface LoginFormProps {
  onSuccess?: (data: AuthSuccessResponse) => void;
  onError?: (error: string) => void;
  onRegistrationClick?: () => void;
}

/**
 * Interactive form component for user authentication.
 * Handles email and password input, client-side validation, form submission, and error display.
 * Manages loading state during authentication request.
 */
export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess, onError, onRegistrationClick }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState({
    email: null as string | null,
    password: null as string | null,
  });
  const [touched, setTouched] = useState({
    email: false,
    password: false,
  });

  const { validateEmail, validatePassword, validateLoginForm } = useFormValidation();
  const { submitLogin, isLoading } = useAuthForm({
    onSuccess: (data) => {
      // Update global auth store
      setAuthSuccess({
        user: data.user,
        workspace: data.workspace,
        token: data.token,
      });

      // Call parent callback
      onSuccess?.(data);
    },
    onError: (errorMsg) => {
      setAuthError(errorMsg);
      onError?.(errorMsg);
    },
  });

  /**
   * Validate email field on blur
   */
  const handleEmailBlur = useCallback(() => {
    setTouched((prev) => ({ ...prev, email: true }));
    const emailError = validateEmail(email);
    setFieldErrors((prev) => ({ ...prev, email: emailError }));
  }, [email, validateEmail]);

  /**
   * Validate password field on blur
   */
  const handlePasswordBlur = useCallback(() => {
    setTouched((prev) => ({ ...prev, password: true }));
    const passwordError = validatePassword(password);
    setFieldErrors((prev) => ({ ...prev, password: passwordError }));
  }, [password, validatePassword]);

  /**
   * Clear field error on change if field was touched
   */
  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (touched.email) {
      const emailError = validateEmail(value);
      setFieldErrors((prev) => ({ ...prev, email: emailError }));
    }
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (touched.password) {
      const passwordError = validatePassword(value);
      setFieldErrors((prev) => ({ ...prev, password: passwordError }));
    }
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields
    const errors = validateLoginForm(email, password);
    setFieldErrors(errors);
    setTouched({ email: true, password: true });

    // Check if there are errors
    if (errors.email || errors.password) {
      return;
    }

    // Submit form
    await submitLogin({
      email: email.trim(),
      password,
    });
  };

  /**
   * Check if form is valid for submission
   */
  const isFormValid = email.trim() && password && !fieldErrors.email && !fieldErrors.password;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <FormInput
        label="Email"
        name="email"
        type="email"
        value={email}
        onChange={handleEmailChange}
        onBlur={handleEmailBlur}
        error={touched.email ? fieldErrors.email : null}
        placeholder="twoj@email.com"
        required
        autoComplete="email"
        disabled={isLoading}
      />

      <FormInput
        label="Hasło"
        name="password"
        type="password"
        value={password}
        onChange={handlePasswordChange}
        onBlur={handlePasswordBlur}
        error={touched.password ? fieldErrors.password : null}
        placeholder="••••••••"
        required
        autoComplete="current-password"
        disabled={isLoading}
      />

      {/* Forgot Password Link (disabled in MVP) */}
      <div className="text-right">
        <button type="button" disabled className="text-sm text-gray-500 dark:text-gray-400 cursor-not-allowed">
          Zapomniałeś hasła?
        </button>
      </div>

      <Button type="submit" disabled={!isFormValid || isLoading} className="w-full" size="lg">
        {isLoading ? (
          <span className="flex items-center gap-2">
            <span className="inline-block w-4 h-4 border-2 border-gray-300 border-t-white rounded-full animate-spin" />
            Logowanie...
          </span>
        ) : (
          "Zaloguj się"
        )}
      </Button>

      {/* Registration Link */}
      <div className="text-center text-sm">
        <span className="text-gray-600 dark:text-gray-400">Nie masz konta? </span>
        <button
          type="button"
          onClick={onRegistrationClick}
          disabled={isLoading}
          className="text-blue-600 dark:text-blue-400 hover:underline font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Zarejestruj się
        </button>
      </div>
    </form>
  );
};
