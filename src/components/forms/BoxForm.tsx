import React, { useState, useCallback } from "react";
import { NameInput } from "./NameInput";
import { DescriptionTextarea } from "./DescriptionTextarea";
import { TagInput } from "./TagInput";
import { LocationSelector } from "./LocationSelector";
import { QRCodeSelector } from "./QRCodeSelector";
import { FormActions } from "./FormActions";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { ConfirmationDialog } from "@/components/shared/ConfirmationDialog";
import { DuplicateNameWarning } from "./DuplicateNameWarning";
import { useBoxForm } from "@/components/hooks/useBoxForm";
import { apiFetch } from "@/lib/api-client";
import type { CheckDuplicateBoxResponse } from "@/types";
import { log } from "@/lib/services/logger.client";

export interface BoxFormProps {
  mode: "create" | "edit";
  boxId?: string;
  workspaceId?: string;
  initialLocationId?: string;
  onSuccess?: (boxId: string) => void;
  onCancel?: () => void;
}

/**
 * BoxForm - Main form component for creating and editing boxes.
 * Orchestrates all form fields and handles submission/deletion flows.
 * Supports both create and edit modes with conditional rendering.
 */
export function BoxForm({ mode, boxId, workspaceId, initialLocationId, onSuccess, onCancel }: BoxFormProps) {
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<CheckDuplicateBoxResponse | null>(null);
  const [isDuplicateConfirmed, setIsDuplicateConfirmed] = useState(false);

  // Initialize form hook
  const {
    formState,
    currentWorkspaceId,
    setFormField,
    resetForm,
    submitForm,
    deleteBox,
    loadAvailableQRCodes,
    isFormValid,
    suggestedTags,
  } = useBoxForm(mode, boxId, workspaceId);

  // Set initial location if provided
  React.useEffect(() => {
    if (initialLocationId && formState.location_id !== initialLocationId) {
      setFormField("location_id", initialLocationId);
    }
  }, [initialLocationId, formState.location_id, setFormField]);

  // Check for duplicate box names before submission
  const checkDuplicateName = useCallback(async (): Promise<boolean> => {
    // Skip if name is empty (will be caught by validation)
    if (!formState.name.trim()) {
      return true;
    }

    try {
      const response = await apiFetch<CheckDuplicateBoxResponse>("/api/boxes/check-duplicate", {
        method: "POST",
        body: JSON.stringify({
          workspace_id: currentWorkspaceId,
          name: formState.name,
          exclude_box_id: mode === "edit" ? boxId : undefined,
        }),
      });

      if (response.isDuplicate) {
        setDuplicateWarning(response);
        return false; // Don't proceed with submit
      }

      return true; // OK to submit
    } catch (error) {
      // Gracefully fail - don't block user if duplicate check fails
      log.error("BoxForm duplicate check failed", { error, workspaceId: currentWorkspaceId, name: formState.name });
      return true; // Allow submit anyway
    }
  }, [formState.name, currentWorkspaceId, mode, boxId]);

  // Handle form submission
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSubmitError(null);

      // Check for duplicates first (unless user already confirmed)
      if (!isDuplicateConfirmed) {
        const canProceed = await checkDuplicateName();
        if (!canProceed) {
          return; // Show warning, wait for user action
        }
      }

      try {
        await submitForm();
        // Success - call callback or redirect to dashboard
        if (onSuccess && formState.currentBox?.id) {
          onSuccess(formState.currentBox.id);
        } else {
          // Redirect to dashboard after successful creation/update
          window.location.href = "/app";
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Nie udało się zapisać pudełka";
        setSubmitError(errorMessage);
      }
    },
    [submitForm, onSuccess, formState.currentBox?.id, isDuplicateConfirmed, checkDuplicateName]
  );

  // Handle delete button click
  const handleDeleteClick = useCallback(() => {
    setShowDeleteConfirmation(true);
  }, []);

  // Handle delete confirmation
  const handleDeleteConfirm = useCallback(async () => {
    try {
      await deleteBox();
      setShowDeleteConfirmation(false);
      // Success - call callback
      if (onSuccess && formState.currentBox?.id) {
        onSuccess(formState.currentBox.id);
      } else if (onCancel) {
        onCancel();
      }
    } catch (error) {
      // Error is handled in the hook and stored in formState.errors
      log.error("BoxForm delete failed", { error, boxId: formState.currentBox?.id });
    }
  }, [deleteBox, onSuccess, onCancel, formState.currentBox?.id]);

  // Handle cancel - redirect to dashboard
  const handleCancel = useCallback(() => {
    if (onCancel) {
      onCancel();
    } else {
      window.location.href = "/app";
    }
  }, [onCancel]);

  // Handle reset - clear form fields
  const handleReset = useCallback(() => {
    resetForm();
  }, [resetForm]);

  // Handle duplicate warning dismiss (user wants to change name)
  const handleDuplicateDismiss = useCallback(() => {
    setDuplicateWarning(null);
    setIsDuplicateConfirmed(false);
  }, []);

  // Handle duplicate warning proceed (user confirms duplicate is OK)
  const handleDuplicateProceed = useCallback(() => {
    setIsDuplicateConfirmed(true);
    setDuplicateWarning(null);
    // Re-trigger form submission by calling handleSubmit programmatically
    // We'll use a small timeout to ensure state updates
    setTimeout(() => {
      const form = document.querySelector("form");
      if (form) {
        form.requestSubmit();
      }
    }, 0);
  }, []);

  // Show loading spinner while data loads
  if (formState.isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner message="Loading form..." />
      </div>
    );
  }

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="space-y-6 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6"
      >
        {/* Form Header */}
        <div className="border-b border-gray-200 dark:border-gray-800 pb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {mode === "create" ? "Utwórz nowe pudełko" : "Edytuj pudełko"}
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {mode === "create" ? "Dodaj nowe pudełko do swojego workspace" : "Zaktualizuj szczegóły pudełka"}
          </p>
        </div>

        {/* General error message */}
        {submitError && (
          <div
            className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-md"
            role="alert"
          >
            <p className="text-sm text-red-700 dark:text-red-400">{submitError}</p>
          </div>
        )}

        {/* General form-level error from hook */}
        {formState.errors.general && (
          <div
            className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-md"
            role="alert"
          >
            <p className="text-sm text-red-700 dark:text-red-400">{formState.errors.general}</p>
          </div>
        )}

        {/* Duplicate Name Warning */}
        {duplicateWarning && duplicateWarning.isDuplicate && (
          <DuplicateNameWarning
            count={duplicateWarning.count}
            onDismiss={handleDuplicateDismiss}
            onProceed={handleDuplicateProceed}
          />
        )}

        {/* Form Fields */}
        <fieldset disabled={formState.isSaving || formState.isDeleting} className="space-y-6">
          {/* Name Field */}
          <NameInput
            value={formState.name}
            onChange={(value) => setFormField("name", value)}
            error={formState.errors.name}
            disabled={formState.isSaving}
          />

          {/* Description Field */}
          <DescriptionTextarea
            value={formState.description}
            onChange={(value) => setFormField("description", value)}
            error={formState.errors.description}
            disabled={formState.isSaving}
            maxLength={10000}
          />

          {/* Tags Field */}
          <TagInput
            value={formState.tags}
            onChange={(tags) => setFormField("tags", tags)}
            error={formState.errors.tags}
            disabled={formState.isSaving}
            suggestedTags={suggestedTags}
            maxTags={10}
          />

          {/* Location Field */}
          <LocationSelector
            value={formState.location_id}
            onChange={(locationId) => setFormField("location_id", locationId)}
            error={formState.errors.location_id}
            disabled={formState.isSaving}
            workspaceId={currentWorkspaceId || ""}
          />

          {/* QR Code Field */}
          <QRCodeSelector
            value={formState.qr_code_id}
            onChange={(qrCodeId) => setFormField("qr_code_id", qrCodeId)}
            error={formState.errors.qr_code_id}
            disabled={formState.isSaving}
            workspaceId={currentWorkspaceId || ""}
            isLoading={formState.isLoading}
            isEditing={mode === "edit"}
            currentQRCode={formState.currentBox?.qr_code?.short_id}
            availableQRCodes={formState.availableQRCodes}
            onGenerateBatch={loadAvailableQRCodes}
          />
        </fieldset>

        {/* Form Actions */}
        <FormActions
          onCancel={handleCancel}
          onReset={mode === "create" ? handleReset : undefined}
          onDelete={mode === "edit" ? handleDeleteClick : undefined}
          isSaving={formState.isSaving}
          isDeleting={formState.isDeleting}
          mode={mode}
          disabled={!isFormValid}
          isDirty={formState.isDirty}
        />
      </form>

      {/* Delete Confirmation Dialog */}
      {mode === "edit" && (
        <ConfirmationDialog
          isOpen={showDeleteConfirmation}
          title="Usuń pudełko?"
          description={`Ta operacja jest nieodwracalna. Pudełko "${formState.name || "Bez nazwy"}" i wszystkie jego dane zostaną trwale usunięte.`}
          confirmText="USUŃ"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setShowDeleteConfirmation(false)}
          isDangerous={true}
          isLoading={formState.isDeleting}
          requiresTextConfirmation={true}
        />
      )}
    </>
  );
}
