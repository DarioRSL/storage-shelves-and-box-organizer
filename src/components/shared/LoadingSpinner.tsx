import React from "react";

export interface LoadingSpinnerProps {
  message?: string;
  visible?: boolean;
  progress?: number;
  size?: "sm" | "md" | "lg";
  ariaLive?: "polite" | "assertive";
}

/**
 * Standardized loading indicator component.
 * Provides visual feedback during async operations with optional message and progress.
 * Uses role="status" with aria-live for accessibility.
 */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message,
  visible = true,
  progress,
  size = "md",
  ariaLive = "polite",
}) => {
  if (!visible) return null;

  const sizeMap = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  };

  const spinnerSize = sizeMap[size];

  return (
    <div
      className="flex flex-col items-center justify-center gap-3"
      role="status"
      aria-live={ariaLive}
      aria-label={message || "Loading"}
    >
      {/* Spinner SVG */}
      <svg className={`${spinnerSize} animate-spin text-blue-600 dark:text-blue-400`} fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>

      {/* Message */}
      {message && <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{message}</p>}

      {/* Progress bar (optional) */}
      {progress !== undefined && (
        <div className="w-48 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full transition-all duration-300"
            style={{ width: `${Math.min(progress, 100)}%` }}
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      )}
    </div>
  );
};
