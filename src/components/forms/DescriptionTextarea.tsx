import React, { useEffect, useRef } from "react";
import { AlertCircle } from "lucide-react";

export interface DescriptionTextareaProps {
  value: string | null;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  disabled?: boolean;
  maxLength?: number;
}

/**
 * DescriptionTextarea - Textarea field for entering box description/contents.
 * Supports character counter with warning color when >80% of max length.
 */
export function DescriptionTextarea({
  value,
  onChange,
  onBlur,
  error,
  disabled = false,
  maxLength = 10000,
}: DescriptionTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const currentLength = value?.length ?? 0;
  const warningThreshold = maxLength * 0.8;
  const isWarning = currentLength > warningThreshold;

  // Auto-resize textarea (optional, but improves UX)
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const newHeight = Math.min(Math.max(textareaRef.current.scrollHeight, 100), 300);
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [value]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label htmlFor="box-description" className="block text-sm font-medium text-gray-900 dark:text-gray-100">
          Description
        </label>
        <span
          className={`text-xs ${
            isWarning ? "text-yellow-600 dark:text-yellow-400" : "text-gray-500 dark:text-gray-400"
          }`}
        >
          {currentLength.toLocaleString()} / {maxLength.toLocaleString()}
        </span>
      </div>

      {/* Progress bar (optional but nice visual feedback) */}
      <div className="w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full transition-colors ${isWarning ? "bg-yellow-500" : "bg-blue-500"}`}
          style={{ width: `${Math.min((currentLength / maxLength) * 100, 100)}%` }}
        />
      </div>

      <div className="relative">
        <textarea
          ref={textareaRef}
          id="box-description"
          data-testid="box-description-textarea"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          disabled={disabled}
          placeholder="e.g., List contents, special items, condition notes..."
          maxLength={maxLength}
          rows={4}
          className={`w-full px-3 py-2 border rounded-md text-sm transition-colors resize-none ${
            error
              ? "border-red-500 bg-red-50 dark:bg-red-950"
              : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
          } text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
          aria-invalid={!!error}
          aria-describedby={error ? "box-description-error" : undefined}
        />
        {error && <AlertCircle className="absolute right-3 top-3 h-5 w-5 text-red-500" />}
      </div>

      {error && (
        <p id="box-description-error" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
