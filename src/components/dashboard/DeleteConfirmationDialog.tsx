import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle } from "lucide-react";

interface DeleteConfirmationDialogProps {
  isOpen: boolean;
  type: "location" | "box";
  title: string;
  description: string;
  itemName: string;
  warning?: string;
  isLoading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Generic delete confirmation dialog
 * Used for locations and boxes
 */
export default function DeleteConfirmationDialog({
  isOpen,
  type,
  title,
  description,
  warning,
  isLoading,
  onConfirm,
  onCancel,
}: DeleteConfirmationDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onCancel}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <AlertDialogTitle>{title}</AlertDialogTitle>
              <AlertDialogDescription className="mt-2">{description}</AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        {type === "location" && (
          <div className="rounded-md bg-yellow-50 p-3 text-sm text-yellow-700 border border-yellow-200" role="note">
            Wszystkie pudełka w tej lokalizacji będą przeniesione do sekcji "Bez lokalizacji"
          </div>
        )}

        {warning && (
          <div className="rounded-md bg-red-50 p-3 border border-red-200" role="note">
            <p className="text-sm text-red-700">{warning}</p>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button variant="outline" disabled={isLoading}>
              Anuluj
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-red-600 text-white hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            {isLoading ? "Usuwanie..." : "Usuń"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
