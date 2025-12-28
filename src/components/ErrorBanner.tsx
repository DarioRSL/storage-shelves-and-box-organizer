import React, { useEffect } from "react";
import { Alert } from "@/components/ui/alert";

export interface ErrorBannerProps {
  message: string;
  onDismiss?: () => void;
  autoCloseDuration?: number;
}

/**
 * Global error message display component shown at the top of the form area.
 * Provides prominent error notification for authentication failures and other submission errors.
 */
export const ErrorBanner: React.FC<ErrorBannerProps> = ({ message, onDismiss, autoCloseDuration }) => {
  useEffect(() => {
    if (autoCloseDuration && onDismiss) {
      const timer = setTimeout(onDismiss, autoCloseDuration);
      return () => clearTimeout(timer);
    }
  }, [autoCloseDuration, onDismiss]);

  return (
    <Alert className="border-red-500 bg-red-50 dark:bg-red-950/20">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="text-red-600 dark:text-red-400 mt-0.5">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          </span>
          <div>
            <p className="text-sm font-medium text-red-800 dark:text-red-300">Błąd</p>
            <p className="text-sm text-red-700 dark:text-red-400 mt-0.5">{message}</p>
          </div>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 flex-shrink-0"
            aria-label="Zamknij komunikat o błędzie"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}
      </div>
    </Alert>
  );
};
