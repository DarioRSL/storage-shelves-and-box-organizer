import { useState, useCallback } from "react";
import { z } from "zod";
import type { FormFieldValue } from "@/types";
import { log } from "@/lib/services/logger.client";

export interface UseFormOptions<T extends Record<string, FormFieldValue>> {
  initialValues: T;
  validationSchema?: z.ZodSchema;
  onSubmit: (values: T) => Promise<void>;
}

export interface UseFormReturn<T extends Record<string, FormFieldValue>> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isDirty: boolean;
  isSubmitting: boolean;

  setFieldValue: (field: keyof T, value: FormFieldValue) => void;
  setFieldTouched: (field: keyof T, value: boolean) => void;
  setErrors: (errors: Partial<Record<keyof T, string>>) => void;
  handleSubmit: (e?: React.FormEvent) => Promise<void>;
  reset: () => void;
  setFieldError: (field: keyof T, error: string | null) => void;
}

/**
 * Generic form state management hook with client-side validation.
 * Handles form field values, validation errors, touched state, and submission.
 *
 * Features:
 * - Real-time validation with Zod schema
 * - Track touched fields (show errors only after interaction)
 * - Track dirty state (form changed)
 * - Automatic form reset after submission
 * - Type-safe with generics
 *
 * Usage:
 * ```typescript
 * const { values, errors, touched, handleSubmit } = useForm({
 *   initialValues: { email: '', password: '' },
 *   validationSchema: loginSchema,
 *   onSubmit: async (values) => { await api.login(values); }
 * });
 * ```
 */
export function useForm<T extends Record<string, FormFieldValue>>({
  initialValues,
  validationSchema,
  onSubmit,
}: UseFormOptions<T>): UseFormReturn<T> {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrorsState] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initialValuesRef] = useState(initialValues);

  // Check if form is dirty (changed from initial values)
  const isDirty = JSON.stringify(values) !== JSON.stringify(initialValuesRef);

  /**
   * Validate a single field or entire form
   */
  const validateField = useCallback(
    (field?: keyof T): Partial<Record<keyof T, string>> => {
      if (!validationSchema) return {};

      try {
        if (field) {
          // Validate single field
          validationSchema.parse(values);
          return {};
        } else {
          // Validate entire form
          validationSchema.parse(values);
          return {};
        }
      } catch (error) {
        if (error instanceof z.ZodError) {
          const fieldErrors: Partial<Record<keyof T, string>> = {};
          error.errors.forEach((err) => {
            const fieldName = err.path[0] as keyof T;
            if (fieldName) {
              fieldErrors[fieldName] = err.message;
            }
          });
          return fieldErrors;
        }
        return {};
      }
    },
    [values, validationSchema]
  );

  /**
   * Set value for a single field
   */
  const setFieldValue = useCallback((field: keyof T, value: FormFieldValue) => {
    setValues((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  /**
   * Mark field as touched
   */
  const setFieldTouched = useCallback(
    (field: keyof T, value: boolean) => {
      setTouched((prev) => ({
        ...prev,
        [field]: value,
      }));

      // Validate field when blurred
      if (value === false) {
        const fieldErrors = validateField(field);
        if (Object.keys(fieldErrors).length > 0) {
          setErrorsState((prev) => ({
            ...prev,
            ...fieldErrors,
          }));
        } else {
          setErrorsState((prev) => {
            // Remove error using destructuring (safer than delete)
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { [field]: _removed, ...newErrors } = prev;
            return newErrors;
          });
        }
      }
    },
    [validateField]
  );

  /**
   * Set errors directly
   */
  const setErrors = useCallback((newErrors: Partial<Record<keyof T, string>>) => {
    setErrorsState(newErrors);
  }, []);

  /**
   * Set error for a single field
   */
  const setFieldError = useCallback((field: keyof T, error: string | null) => {
    setErrorsState((prev) => {
      if (error) {
        return { ...prev, [field]: error };
      } else {
        // Remove error using destructuring (safer than delete)
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [field]: _removed, ...newErrors } = prev;
        return newErrors;
      }
    });
  }, []);

  /**
   * Reset form to initial values
   */
  const reset = useCallback(() => {
    setValues(initialValuesRef);
    setErrorsState({});
    setTouched({});
    setIsSubmitting(false);
  }, [initialValuesRef]);

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();

      // Validate form
      const formErrors = validateField();
      if (Object.keys(formErrors).length > 0) {
        setErrorsState(formErrors);
        return;
      }

      setIsSubmitting(true);
      try {
        await onSubmit(values);
        // Reset form on success
        reset();
      } catch (error) {
        // Error handling should be done in onSubmit callback
        log.error("useForm submission error", { error });
      } finally {
        setIsSubmitting(false);
      }
    },
    [values, validateField, onSubmit, reset]
  );

  return {
    values,
    errors,
    touched,
    isDirty,
    isSubmitting,
    setFieldValue,
    setFieldTouched,
    setErrors,
    setFieldError,
    handleSubmit,
    reset,
  };
}
