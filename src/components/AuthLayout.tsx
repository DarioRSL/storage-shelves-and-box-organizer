import React, { useState, useCallback } from "react";
import { ErrorBanner } from "@/components/ErrorBanner";
import { AuthCard } from "@/components/AuthCard";
import type { AuthSuccessResponse } from "@/components/hooks/useAuthForm";

export interface AuthLayoutProps {
  initialMode?: "login" | "register";
  onAuthSuccess?: (data: AuthSuccessResponse) => void;
}

/**
 * Main React wrapper component that manages overall authentication page layout and styling.
 * Provides responsive design container, handles page-wide state coordination,
 * and manages error display across the entire authentication interface.
 */
export const AuthLayout: React.FC<AuthLayoutProps> = ({ initialMode = "login", onAuthSuccess }) => {
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [activeMode, setActiveMode] = useState<"login" | "register">(initialMode);

  const handleModeChange = useCallback((mode: "login" | "register") => {
    setActiveMode(mode);
    setGlobalError(null);
  }, []);

  const handleDismissError = useCallback(() => {
    setGlobalError(null);
  }, []);

  const handleAuthSuccess = useCallback(
    (data: AuthSuccessResponse) => {
      onAuthSuccess?.(data);
    },
    [onAuthSuccess]
  );

  const handleAuthError = useCallback((error: string) => {
    setGlobalError(error);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Logo / Branding Section */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Organizator</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Zarządzaj swoimi pudłami inteligentnie</p>
        </div>

        {/* Error Banner */}
        {globalError && (
          <div className="mb-6">
            <ErrorBanner message={globalError} onDismiss={handleDismissError} />
          </div>
        )}

        {/* Auth Card with Forms */}
        <div className="mb-6">
          <AuthCard
            activeMode={activeMode}
            onModeChange={handleModeChange}
            onSuccess={handleAuthSuccess}
            onError={handleAuthError}
          />
        </div>

        {/* Footer Links (optional) */}
        <div className="text-center text-sm text-gray-600 dark:text-gray-400">
          <p>
            Mamy nadzieję, że spodoba Ci się nasza aplikacja!{" "}
            <button
              onClick={(e) => e.preventDefault()}
              className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              Dowiedz się więcej
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
