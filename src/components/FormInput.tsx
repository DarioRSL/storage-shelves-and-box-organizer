import React from "react";
import { Input } from "@/components/ui/input";

export interface FormInputProps {
  label: string;
  name: string;
  type?: "text" | "email" | "password";
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string | null;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  autoComplete?: string;
}

/**
 * Reusable form input component with label, error display, and validation feedback.
 * Provides consistent styling and accessibility across all form inputs.
 */
export const FormInput: React.FC<FormInputProps> = ({
  label,
  name,
  type = "text",
  value,
  onChange,
  onBlur,
  error,
  placeholder,
  disabled = false,
  required = false,
  autoComplete,
}) => {
  const inputId = `input-${name}`;

  return (
    <div className="space-y-2">
      <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <Input
        id={inputId}
        name={name}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete={autoComplete}
        className={`${error ? "border-red-500 focus-visible:ring-red-500" : "focus-visible:ring-blue-500"}`}
        aria-invalid={!!error}
        aria-describedby={error ? `error-${name}` : undefined}
      />
      {error && (
        <p id={`error-${name}`} className="text-sm text-red-600 dark:text-red-400 flex items-center mt-1">
          <span className="mr-1">⚠</span>
          {error}
        </p>
      )}
    </div>
  );
};
