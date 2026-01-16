import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FormInput } from "@/components/FormInput";
import { PasswordStrengthIndicator } from "@/components/PasswordStrengthIndicator";
import { useFormValidation } from "@/components/hooks/useFormValidation";
import { useAuthForm, type AuthSuccessResponse } from "@/components/hooks/useAuthForm";
import { setAuthSuccess, setAuthError } from "@/lib/stores/auth.store";

export interface RegistrationFormProps {
  onSuccess?: (data: AuthSuccessResponse) => void;
  onError?: (error: string) => void;
  onLoginClick?: () => void;
}

/**
 * Interactive form component for new user account creation.
 * Handles email, password, and password confirmation inputs with advanced validation
 * including password strength indicator. Manages server-side errors and provides clear user guidance.
 */
export const RegistrationForm: React.FC<RegistrationFormProps> = ({ onSuccess, onError, onLoginClick }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreeToPasswordLimitation, setAgreeToPasswordLimitation] = useState(false);

  const [fieldErrors, setFieldErrors] = useState({
    email: null as string | null,
    password: null as string | null,
    confirmPassword: null as string | null,
  });

  const [touched, setTouched] = useState({
    email: false,
    password: false,
    confirmPassword: false,
  });

  const { validateEmail, validatePassword, validatePasswordMatch, validateRegistrationForm } = useFormValidation();

  const { submitRegistration, isLoading } = useAuthForm({
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

    // Also revalidate confirm password if it's been touched
    if (touched.confirmPassword && confirmPassword) {
      const matchError = validatePasswordMatch(password, confirmPassword);
      setFieldErrors((prev) => ({ ...prev, confirmPassword: matchError }));
    }
  }, [password, confirmPassword, touched.confirmPassword, validatePassword, validatePasswordMatch]);

  /**
   * Validate confirm password field on blur
   */
  const handleConfirmPasswordBlur = useCallback(() => {
    setTouched((prev) => ({ ...prev, confirmPassword: true }));
    const matchError = validatePasswordMatch(password, confirmPassword);
    setFieldErrors((prev) => ({ ...prev, confirmPassword: matchError }));
  }, [password, confirmPassword, validatePasswordMatch]);

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

    // Revalidate confirm password when password changes
    if (touched.confirmPassword && confirmPassword) {
      const matchError = validatePasswordMatch(value, confirmPassword);
      setFieldErrors((prev) => ({ ...prev, confirmPassword: matchError }));
    }
  };

  const handleConfirmPasswordChange = (value: string) => {
    setConfirmPassword(value);
    if (touched.confirmPassword) {
      const matchError = validatePasswordMatch(password, value);
      setFieldErrors((prev) => ({ ...prev, confirmPassword: matchError }));
    }
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields
    const errors = validateRegistrationForm(email, password, confirmPassword);
    setFieldErrors(errors);
    setTouched({ email: true, password: true, confirmPassword: true });

    // Check if there are errors
    if (errors.email || errors.password || errors.confirmPassword) {
      return;
    }

    // Check if user agreed to password limitation
    if (!agreeToPasswordLimitation) {
      onError?.("Musisz potwierdzić ograniczenie odzyskiwania hasła");
      return;
    }

    // Submit form
    await submitRegistration({
      email: email.trim(),
      password,
      confirmPassword,
      agreeToPasswordLimitation,
    });
  };

  /**
   * Check if form is valid for submission
   */
  const isFormValid =
    email.trim() &&
    password &&
    confirmPassword &&
    agreeToPasswordLimitation &&
    !fieldErrors.email &&
    !fieldErrors.password &&
    !fieldErrors.confirmPassword;

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
        autoComplete="new-password"
        disabled={isLoading}
      />

      {/* Password Strength Indicator */}
      {password && (
        <div className="pt-2">
          <PasswordStrengthIndicator password={password} showRequirements={true} />
        </div>
      )}

      <FormInput
        label="Potwierdzenie Hasła"
        name="confirmPassword"
        type="password"
        value={confirmPassword}
        onChange={handleConfirmPasswordChange}
        onBlur={handleConfirmPasswordBlur}
        error={touched.confirmPassword ? fieldErrors.confirmPassword : null}
        placeholder="••••••••"
        required
        autoComplete="new-password"
        disabled={isLoading}
      />

      {/* Password Recovery Notice Checkbox */}
      <div className="flex items-start space-x-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <Checkbox
          id="passwordLimitation"
          checked={agreeToPasswordLimitation}
          onCheckedChange={(checked) => setAgreeToPasswordLimitation(checked === true)}
          disabled={isLoading}
          className="mt-1"
        />
        <label htmlFor="passwordLimitation" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer flex-1">
          <span className="font-medium block">Rozumiem ograniczenia odzyskiwania hasła</span>
          <span className="text-xs text-gray-600 dark:text-gray-400 block mt-1">
            W obecnej wersji nie mamy możliwości odzyskania hasła. Upewnij się, że pamiętasz swoje hasło lub
            przechowujesz je w bezpiecznym miejscu.
          </span>
        </label>
      </div>

      <Button type="submit" disabled={!isFormValid || isLoading} className="w-full" size="lg">
        {isLoading ? (
          <span className="flex items-center gap-2">
            <span className="inline-block w-4 h-4 border-2 border-gray-300 border-t-white rounded-full animate-spin" />
            Rejestracja...
          </span>
        ) : (
          "Zarejestruj się"
        )}
      </Button>

      {/* Login Link */}
      <div className="text-center text-sm">
        <span className="text-gray-600 dark:text-gray-400">Masz już konto? </span>
        <button
          type="button"
          onClick={onLoginClick}
          disabled={isLoading}
          className="text-blue-600 dark:text-blue-400 hover:underline font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Zaloguj się
        </button>
      </div>
    </form>
  );
};
