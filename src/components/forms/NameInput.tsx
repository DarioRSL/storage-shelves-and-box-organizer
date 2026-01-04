import React from "react";
import { AlertCircle } from "lucide-react";

export interface NameInputProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  disabled?: boolean;
}

/**
 * NameInput - Text input for entering box name.
 * Supports validation feedback and error display.
 */
export function NameInput({ value, onChange, onBlur, error, disabled = false }: NameInputProps) {
  return (
    <div className="space-y-2">
      <label htmlFor="box-name" className="block text-sm font-medium text-gray-900 dark:text-gray-100">
        Box Name
        <span className="ml-1 text-red-500">*</span>
      </label>
      <div className="relative">
        <input
          id="box-name"
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          disabled={disabled}
          placeholder="e.g., Winter clothes"
          maxLength={255}
          className={`w-full px-3 py-2 border rounded-md text-sm transition-colors ${
            error
              ? "border-red-500 bg-red-50 dark:bg-red-950"
              : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
          } text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
          aria-invalid={!!error}
          aria-describedby={error ? "box-name-error" : undefined}
        />
        {error && <AlertCircle className="absolute right-3 top-2.5 h-5 w-5 text-red-500" />}
      </div>
      {error && (
        <p id="box-name-error" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
