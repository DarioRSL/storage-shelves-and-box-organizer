import { useState, useCallback, useEffect } from "react";
import { useStore } from "@nanostores/react";
import { apiFetch, ApiError, extractValidationErrors } from "@/lib/api-client";
import { createBoxSchema, updateBoxSchema } from "@/lib/validation/box";
import { extractZodErrors } from "@/lib/validation/schemas";
import type { BoxDto, LocationDto, QrCodeDetailDto } from "@/types";
import { currentWorkspaceId as currentWorkspaceIdStore } from "@/stores/dashboard";
import { log } from "@/lib/services/logger";

export interface BoxFormState {
  // Form fields
  name: string;
  description: string | null;
  tags: string[];
  location_id: string | null;
  qr_code_id: string | null;

  // UI state
  isLoading: boolean;
  isSaving: boolean;
  isDeleting: boolean;
  isDirty: boolean;
  errors: Record<string, string>;

  // References
  availableLocations: LocationDto[];
  availableQRCodes: QrCodeDetailDto[];
  currentBox?: BoxDto;
}

export interface UseBoxFormReturn {
  // State
  formState: BoxFormState;
  currentWorkspaceId: string | null;

  // Field setters
  setFormField: (
    field: keyof Omit<
      BoxFormState,
      | "isLoading"
      | "isSaving"
      | "isDeleting"
      | "isDirty"
      | "errors"
      | "availableLocations"
      | "availableQRCodes"
      | "currentBox"
    >,
    value: unknown
  ) => void;
  setErrors: (errors: Record<string, string>) => void;
  resetForm: () => void;

  // Actions
  submitForm: () => Promise<void>;
  deleteBox: () => Promise<void>;
  loadBoxData: (boxId: string) => Promise<void>;
  loadLocations: () => Promise<void>;
  loadAvailableQRCodes: () => Promise<void>;

  // Computed
  isFormValid: boolean;
  suggestedTags: string[];
}

const initialFormState: BoxFormState = {
  name: "",
  description: null,
  tags: [],
  location_id: null,
  qr_code_id: null,
  isLoading: false,
  isSaving: false,
  isDeleting: false,
  isDirty: false,
  errors: {},
  availableLocations: [],
  availableQRCodes: [],
};

/**
 * useBoxForm - Custom hook for managing box form state and API communication.
 * Handles create and edit modes with validation, error handling, and data loading.
 *
 * @param mode - 'create' or 'edit' mode
 * @param boxId - Required for edit mode
 * @param workspaceId - Required workspace ID (optional, can be fetched from store)
 * @returns Form state, setters, and action functions
 */
export function useBoxForm(mode: "create" | "edit", boxId?: string, workspaceId?: string): UseBoxFormReturn {
  const [formState, setFormState] = useState<BoxFormState>(initialFormState);
  const [initialState, setInitialState] = useState<BoxFormState>(initialFormState);

  // Get workspace ID from prop or store
  const storeWorkspaceId = useStore(currentWorkspaceIdStore);
  const currentWorkspaceId = workspaceId || storeWorkspaceId;

  // Internal function to load locations
  const loadLocationsInternal = useCallback(async () => {
    try {
      const data = await apiFetch<LocationDto[]>(`/api/locations?workspace_id=${currentWorkspaceId}`);
      setFormState((prev) => ({
        ...prev,
        availableLocations: data || [],
      }));
    } catch (error) {
      log.error("Failed to load locations", { error, workspaceId: currentWorkspaceId });
      setFormState((prev) => ({
        ...prev,
        errors: { ...prev.errors, locations: "Failed to load locations" },
      }));
    }
  }, [currentWorkspaceId]);

  // Internal function to load QR codes
  const loadQRCodesInternal = useCallback(async () => {
    try {
      const data = await apiFetch<QrCodeDetailDto[]>(
        `/api/qr-codes?workspace_id=${currentWorkspaceId}&status=generated`
      );
      setFormState((prev) => ({
        ...prev,
        availableQRCodes: data || [],
      }));
    } catch (error) {
      log.error("Failed to load QR codes", { error, workspaceId: currentWorkspaceId });
      // Non-critical error, don't show to user
    }
  }, [currentWorkspaceId]);

  // Internal function to load box data (edit mode)
  const loadBoxDataInternal = useCallback(
    async (id: string) => {
      try {
        const boxData = await apiFetch<BoxDto>(`/api/boxes/${id}`);

        const newState: BoxFormState = {
          ...formState,
          name: boxData.name,
          description: boxData.description || null,
          tags: boxData.tags || [],
          location_id: boxData.location?.id || null,
          qr_code_id: boxData.qr_code?.id || null,
          currentBox: boxData,
        };

        setFormState(newState);
        setInitialState(newState);
      } catch (error) {
        log.error("Failed to load box data", { error, boxId: id });
        if (error instanceof ApiError && error.status === 401) {
          window.location.href = "/auth";
        }
        setFormState((prev) => ({
          ...prev,
          errors: { ...prev.errors, general: "Failed to load box data" },
        }));
      }
    },
    [formState]
  );

  // Load initial data on mount or when workspace becomes available
  useEffect(() => {
    // Wait until we have a workspace ID
    if (!currentWorkspaceId) {
      return;
    }

    const loadInitialData = async () => {
      setFormState((prev) => ({ ...prev, isLoading: true }));

      try {
        // Load locations for all modes
        await loadLocationsInternal();

        // Load available QR codes
        await loadQRCodesInternal();

        // In edit mode, load box data
        if (mode === "edit" && boxId) {
          await loadBoxDataInternal(boxId);
        }
      } finally {
        setFormState((prev) => ({ ...prev, isLoading: false }));
      }
    };

    loadInitialData();
  }, [mode, boxId, currentWorkspaceId, loadLocationsInternal, loadQRCodesInternal, loadBoxDataInternal]);

  // Track if form is dirty
  useEffect(() => {
    const isDirty =
      formState.name !== initialState.name ||
      formState.description !== initialState.description ||
      JSON.stringify(formState.tags) !== JSON.stringify(initialState.tags) ||
      formState.location_id !== initialState.location_id ||
      formState.qr_code_id !== initialState.qr_code_id;

    if (formState.isDirty !== isDirty) {
      setFormState((prev) => ({ ...prev, isDirty }));
    }
  }, [
    formState.name,
    formState.description,
    formState.tags,
    formState.location_id,
    formState.qr_code_id,
    formState.isDirty,
    initialState.name,
    initialState.description,
    initialState.tags,
    initialState.location_id,
    initialState.qr_code_id,
  ]);

  // Public function to set form field
  const setFormField = useCallback((field: string, value: unknown) => {
    setFormState((prev) => {
      // Remove error for this field using destructuring (safer than delete)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [field]: _removed, ...newErrors } = prev.errors;
      return {
        ...prev,
        [field]: value,
        // Clear error for this field when user modifies it
        errors: newErrors,
      };
    });
  }, []);

  // Public function to set errors
  const setErrors = useCallback((errors: Record<string, string>) => {
    setFormState((prev) => ({ ...prev, errors }));
  }, []);

  // Reset form to initial state
  const resetForm = useCallback(() => {
    setFormState(initialState);
  }, [initialState]);

  // Public function to load locations
  const loadLocations = useCallback(async () => {
    await loadLocationsInternal();
  }, [loadLocationsInternal]);

  // Public function to load QR codes
  const loadAvailableQRCodes = useCallback(async (): Promise<void> => {
    await loadQRCodesInternal();
  }, [loadQRCodesInternal]);

  // Public function to load box data
  const loadBoxData = useCallback(
    async (id: string) => {
      await loadBoxDataInternal(id);
    },
    [loadBoxDataInternal]
  );

  // Submit form (create or update)
  const submitForm = useCallback(async () => {
    setFormState((prev) => ({ ...prev, isSaving: true, errors: {} }));

    try {
      // Prepare payload based on mode
      const payload =
        mode === "create"
          ? {
              workspace_id: currentWorkspaceId,
              name: formState.name,
              description: formState.description,
              tags: formState.tags.length > 0 ? formState.tags : null,
              location_id: formState.location_id,
              qr_code_id: formState.qr_code_id,
            }
          : (() => {
              const updates: Record<string, unknown> = {};

              if (formState.name !== initialState.name) {
                updates.name = formState.name;
              }
              if (formState.description !== initialState.description) {
                updates.description = formState.description;
              }
              if (JSON.stringify(formState.tags) !== JSON.stringify(initialState.tags)) {
                updates.tags = formState.tags;
              }
              if (formState.location_id !== initialState.location_id) {
                updates.location_id = formState.location_id;
              }
              if (formState.qr_code_id !== initialState.qr_code_id) {
                updates.qr_code_id = formState.qr_code_id;
              }

              return updates;
            })();

      // Validate with appropriate schema
      const schema = mode === "create" ? createBoxSchema : updateBoxSchema;
      const validationResult = schema.safeParse(payload);

      if (!validationResult.success) {
        const errors = extractZodErrors(validationResult.error);
        setFormState((prev) => ({ ...prev, errors }));
        throw new Error("Validation failed");
      }

      // Call API
      const endpoint = mode === "create" ? `/api/boxes` : `/api/boxes/${boxId}`;

      const method = mode === "create" ? "POST" : "PATCH";

      await apiFetch(endpoint, {
        method,
        body: JSON.stringify(validationResult.data),
      });

      // Success
      setFormState((prev) => ({
        ...prev,
        isSaving: false,
        errors: {},
        isDirty: false,
      }));

      // Update initial state after successful save
      setInitialState(formState);
    } catch (error) {
      log.error("Form submission error", { error, mode, boxId, workspaceId: currentWorkspaceId });

      if (error instanceof ApiError) {
        if (error.status === 401) {
          window.location.href = "/auth";
          return;
        }

        const validationErrors = extractValidationErrors(error);
        if (Object.keys(validationErrors).length > 0) {
          setFormState((prev) => ({
            ...prev,
            errors: validationErrors,
          }));
        } else {
          setFormState((prev) => ({
            ...prev,
            errors: { general: error.message },
          }));
        }
      } else {
        setFormState((prev) => ({
          ...prev,
          errors: { general: "Failed to submit form" },
        }));
      }

      throw error;
    } finally {
      setFormState((prev) => ({ ...prev, isSaving: false }));
    }
  }, [mode, boxId, currentWorkspaceId, formState, initialState]);

  // Delete box
  const deleteBox = useCallback(async () => {
    if (!boxId) {
      throw new Error("No box ID provided for deletion");
    }

    setFormState((prev) => ({ ...prev, isDeleting: true, errors: {} }));

    try {
      await apiFetch(`/api/boxes/${boxId}`, {
        method: "DELETE",
      });

      setFormState((prev) => ({ ...prev, isDeleting: false, errors: {} }));
    } catch (error) {
      log.error("Delete error", { error, boxId });

      if (error instanceof ApiError) {
        if (error.status === 401) {
          window.location.href = "/auth";
          return;
        }

        setFormState((prev) => ({
          ...prev,
          errors: { general: error.message },
        }));
      } else {
        setFormState((prev) => ({
          ...prev,
          errors: { general: "Failed to delete box" },
        }));
      }

      throw error;
    } finally {
      setFormState((prev) => ({ ...prev, isDeleting: false }));
    }
  }, [boxId]);

  // Compute suggested tags from all available tags
  const suggestedTags = Array.from(new Set(formState.availableLocations.map((loc) => loc.name))).filter(
    (tag) => !formState.tags.includes(tag)
  );

  // Validate form
  const isFormValid = formState.name.trim().length > 0;

  return {
    formState,
    currentWorkspaceId,
    setFormField,
    setErrors,
    resetForm,
    submitForm,
    deleteBox,
    loadBoxData,
    loadLocations,
    loadAvailableQRCodes,
    isFormValid,
    suggestedTags,
  };
}
