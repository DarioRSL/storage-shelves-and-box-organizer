import React, { useState, useCallback } from "react";
import { NameInput } from "./NameInput";
import { DescriptionTextarea } from "./DescriptionTextarea";
import { TagInput } from "./TagInput";
import { LocationSelector } from "./LocationSelector";
import { QRCodeSelector } from "./QRCodeSelector";
import { FormActions } from "./FormActions";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { ConfirmationDialog } from "@/components/shared/ConfirmationDialog";
import { useBoxForm } from "@/components/hooks/useBoxForm";

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

  // Initialize form hook
  const {
    formState,
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

  // Handle form submission
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSubmitError(null);

      try {
        await submitForm();
        // Success - call callback or redirect
        if (onSuccess && formState.currentBox?.id) {
          onSuccess(formState.currentBox.id);
        } else if (onCancel) {
          // For new boxes, we'd need to get the ID from response
          onCancel();
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to submit form";
        setSubmitError(errorMessage);
      }
    },
    [submitForm, onSuccess, onCancel, formState.currentBox?.id]
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
      console.error("Delete failed:", error);
    }
  }, [deleteBox, onSuccess, onCancel, formState.currentBox?.id]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    if (onCancel) {
      onCancel();
    } else {
      resetForm();
    }
  }, [onCancel, resetForm]);

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
            {mode === "create" ? "Create New Box" : "Edit Box"}
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {mode === "create" ? "Add a new box to your workspace" : `Update box details and properties`}
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
            workspaceId={workspaceId || ""}
          />

          {/* QR Code Field */}
          <QRCodeSelector
            value={formState.qr_code_id}
            onChange={(qrCodeId) => setFormField("qr_code_id", qrCodeId)}
            error={formState.errors.qr_code_id}
            disabled={formState.isSaving}
            workspaceId={workspaceId || ""}
            isLoading={formState.isLoading}
            isEditing={mode === "edit"}
            currentQRCode={formState.currentBox?.qr_code?.short_id}
            availableQRCodes={formState.availableQRCodes}
            onGenerateBatch={loadAvailableQRCodes}
          />
        </fieldset>

        {/* Form Actions */}
        <FormActions
          onSubmit={handleSubmit}
          onCancel={handleCancel}
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
          title="Delete Box?"
          description={`This action is irreversible. The box "${formState.name || "Untitled"}" and all its data will be permanently deleted.`}
          confirmText="DELETE"
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
