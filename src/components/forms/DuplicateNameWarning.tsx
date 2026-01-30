import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Props for DuplicateNameWarning component
 */
export interface DuplicateNameWarningProps {
  /**
   * Number of boxes found with duplicate name
   */
  count: number;
  /**
   * Callback when user clicks "Zmień nazwę" (dismiss warning)
   */
  onDismiss: () => void;
  /**
   * Callback when user clicks "Kontynuuj mimo to" (proceed with duplicate name)
   */
  onProceed: () => void;
}

/**
 * Non-blocking warning banner for duplicate box names.
 * Displays yellow/amber alert when box name already exists in workspace.
 *
 * User can choose to:
 * - Dismiss warning and change the name
 * - Proceed anyway with duplicate name
 *
 * Follows project accessibility and styling patterns.
 */
export function DuplicateNameWarning({ count, onDismiss, onProceed }: DuplicateNameWarningProps) {
  // Polish pluralization: 1 pudełko, 2-4 pudełka, 5+ pudełek
  const getPluralizedMessage = (count: number): string => {
    if (count === 1) {
      return "W tym workspace istnieje już pudełko o tej nazwie.";
    } else if (count >= 2 && count <= 4) {
      return `W tym workspace istnieją już ${count} pudełka o tej nazwie.`;
    } else {
      return `W tym workspace istnieje już ${count} pudełek o tej nazwie.`;
    }
  };

  return (
    <div
      className="rounded-md bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 p-4"
      role="alert"
    >
      <div className="flex gap-3">
        {/* Warning Icon */}
        <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" aria-hidden="true" />

        <div className="flex-1">
          {/* Warning Title */}
          <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Uwaga: Nazwa już istnieje</p>

          {/* Warning Message */}
          <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">{getPluralizedMessage(count)}</p>

          {/* Action Buttons */}
          <div className="mt-3 flex gap-2">
            <Button variant="outline" size="sm" onClick={onDismiss} type="button">
              Zmień nazwę
            </Button>
            <Button variant="default" size="sm" onClick={onProceed} type="button">
              Kontynuuj mimo to
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
