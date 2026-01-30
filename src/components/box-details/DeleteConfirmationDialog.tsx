import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface DeleteConfirmationDialogProps {
  isOpen: boolean;
  boxName: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function DeleteConfirmationDialog({
  isOpen,
  boxName,
  onConfirm,
  onCancel,
  isLoading = false,
}: DeleteConfirmationDialogProps) {
  const handleConfirm = async () => {
    await onConfirm();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isLoading && onCancel()}>
      <DialogContent showCloseButton={!isLoading}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            Usuń pudełko
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3 pt-2">
              <p>
                Czy na pewno chcesz usunąć pudełko <strong className="text-foreground">{boxName}</strong>?
              </p>
              <p className="text-destructive font-medium">
                Ta operacja jest nieodwracalna. Wszystkie dane pudełka zostaną trwale usunięte.
              </p>
              <p className="text-sm">Przypisany kod QR zostanie zwolniony i będzie można go użyć ponownie.</p>
            </div>
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onCancel} disabled={isLoading}>
            Anuluj
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={isLoading} className="gap-2">
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                Usuwanie...
              </>
            ) : (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                Tak, usuń pudełko
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
