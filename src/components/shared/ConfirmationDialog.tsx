import React, { useState, useCallback } from "react";
import { Modal } from "./Modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "./LoadingSpinner";

export interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmText: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  isDangerous?: boolean;
  isLoading?: boolean;
  error?: string;
  requiresTextConfirmation?: boolean;
}

/**
 * Reusable modal for confirming dangerous actions (delete, logout, account deletion).
 * Optionally requires user to type a confirmation text before enabling confirm button.
 *
 * Features:
 * - Input field for confirmation text (optional)
 * - Disabled confirm button until input matches
 * - Cancel button for dismissal
 * - isDangerous prop for red styling
 * - Loading state with spinner
 * - Error display
 * - Accessibility: proper ARIA labels and descriptions
 */
export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  title,
  description,
  confirmText,
  onConfirm,
  onCancel,
  isDangerous = false,
  isLoading = false,
  error,
  requiresTextConfirmation = false,
}) => {
  const [inputValue, setInputValue] = useState("");

  // Reset input when modal closes
  React.useEffect(() => {
    if (!isOpen) {
      setInputValue("");
    }
  }, [isOpen]);

  // Check if confirm button should be enabled
  const isConfirmDisabled = isLoading || (requiresTextConfirmation && inputValue !== confirmText);

  const handleConfirm = useCallback(async () => {
    try {
      await onConfirm();
      setInputValue("");
    } catch {
      // Error is handled by parent component via error prop
    }
  }, [onConfirm]);

  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title} isDismissible={!isLoading}>
      <div data-testid="delete-confirmation-dialog" className="space-y-4">
        {/* Description */}
        <p className="text-sm text-gray-700 dark:text-gray-300">{description}</p>

        {/* Confirmation text input (optional) */}
        {requiresTextConfirmation && (
          <div className="space-y-2">
            <label htmlFor="confirmation-input" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Type <span className="font-semibold text-gray-900 dark:text-white">{confirmText}</span> to confirm
            </label>
            <Input
              id="confirmation-input"
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={`Type: ${confirmText}`}
              disabled={isLoading}
              className={
                inputValue && inputValue !== confirmText ? "border-yellow-500 focus-visible:ring-yellow-500" : ""
              }
              aria-describedby="confirmation-description"
            />
            {inputValue && inputValue !== confirmText && (
              <p id="confirmation-description" className="text-xs text-yellow-600 dark:text-yellow-400">
                Text doesn&apos;t match. Please try again.
              </p>
            )}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div
            className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-md"
            role="alert"
          >
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="flex justify-center py-4">
            <LoadingSpinner size="sm" message="Processing..." />
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 justify-end pt-4">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
            className="text-gray-700 dark:text-gray-300"
          >
            Cancel
          </Button>
          <Button
            data-testid="confirm-delete-button"
            onClick={handleConfirm}
            disabled={isConfirmDisabled}
            className={
              isDangerous
                ? "bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 text-white disabled:bg-red-400 disabled:dark:bg-red-600"
                : "bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white disabled:bg-blue-400 disabled:dark:bg-blue-600"
            }
            aria-busy={isLoading}
          >
            {isLoading ? "Processing..." : "Confirm"}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
