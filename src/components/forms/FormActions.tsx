import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface FormActionsProps {
  onSubmit?: () => void;
  onCancel: () => void;
  onReset?: () => void;
  onDelete?: () => void;
  isSaving?: boolean;
  isDeleting?: boolean;
  mode: "create" | "edit";
  disabled?: boolean;
  isDirty?: boolean;
}

/**
 * FormActions - Action buttons section for box form.
 * Displays Save, Cancel, Reset, and optionally Delete buttons.
 * Handles loading states and conditional rendering based on mode.
 */
export function FormActions({
  onSubmit,
  onCancel,
  onReset,
  onDelete,
  isSaving = false,
  isDeleting = false,
  mode,
  disabled = false,
  isDirty = true,
}: FormActionsProps) {
  const isLoading = isSaving || isDeleting;
  const isSubmitDisabled = disabled || isSaving || (mode === "edit" && !isDirty);

  return (
    <div className="flex flex-col-reverse sm:flex-row gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
      {/* Cancel Button - Anuluj */}
      <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading} className="flex-1">
        Anuluj
      </Button>

      {/* Reset Button - Wyczyść (only in create mode) */}
      {mode === "create" && onReset && (
        <Button type="button" variant="outline" onClick={onReset} disabled={isLoading} className="flex-1">
          Wyczyść
        </Button>
      )}

      {/* Delete Button - Usuń (edit mode only) */}
      {mode === "edit" && onDelete && (
        <Button type="button" variant="destructive" onClick={onDelete} disabled={isLoading} className="flex-1">
          Usuń
        </Button>
      )}

      {/* Save/Create Button - Utwórz/Zapisz */}
      <Button
        type="submit"
        onClick={onSubmit}
        disabled={isSubmitDisabled}
        className="flex-1 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white disabled:bg-blue-400 dark:disabled:bg-blue-600"
      >
        {isSaving ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            {mode === "create" ? "Tworzę..." : "Zapisuję..."}
          </>
        ) : mode === "create" ? (
          "Utwórz"
        ) : (
          "Zapisz"
        )}
      </Button>
    </div>
  );
}
