import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { CreateLocationRequest } from "@/types";

interface LocationEditorModalProps {
  isOpen: boolean;
  mode: "create" | "edit";
  workspaceId: string;
  parentLocationId?: string;
  initialValues?: Partial<CreateLocationRequest>;
  onSubmit: (data: CreateLocationRequest) => Promise<void>;
  onClose: () => void;
  isLoading: boolean;
  error?: string | null;
}

/**
 * Modal for creating/editing locations
 */
export default function LocationEditorModal({
  isOpen,
  mode,
  workspaceId,
  parentLocationId,
  initialValues,
  onSubmit,
  onClose,
  isLoading,
  error,
}: LocationEditorModalProps) {
  const [name, setName] = React.useState(initialValues?.name || "");
  const [description, setDescription] = React.useState(initialValues?.description || "");
  const [validationError, setValidationError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!name.trim()) {
      setValidationError("Nazwa lokalizacji jest wymagana");
      return;
    }

    if (name.length > 255) {
      setValidationError("Nazwa nie może być dłuższa niż 255 znaków");
      return;
    }

    if (description && description.length > 1000) {
      setValidationError("Opis nie może być dłuższy niż 1000 znaków");
      return;
    }

    try {
      const data: CreateLocationRequest = {
        workspace_id: workspaceId,
        name: name.trim(),
        description: description.trim() || null,
        parent_id: parentLocationId || null,
      };

      await onSubmit(data);
    } catch (err) {
      console.error("[LocationEditorModal] Error:", err);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Nowa lokalizacja" : "Edytuj lokalizację"}</DialogTitle>
          <DialogDescription>
            {mode === "create" ? "Utwórz nową lokalizację do przechowywania pudełek" : "Zmień szczegóły lokalizacji"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="location-name" className="block text-sm font-medium text-gray-700">
              Nazwa{" "}
              <span className="text-red-500" aria-label="wymagane">
                *
              </span>
            </label>
            <Input
              id="location-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="np. Piwnica, Półka A..."
              maxLength={255}
              disabled={isLoading}
              className="mt-1"
              aria-required="true"
              aria-describedby={validationError || error ? "form-error" : "location-name-hint"}
            />
            <p id="location-name-hint" className="mt-1 text-xs text-gray-500">
              {name.length}/255 znaków
            </p>
          </div>

          <div>
            <label htmlFor="location-desc" className="block text-sm font-medium text-gray-700">
              Opis
            </label>
            <textarea
              id="location-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Opcjonalny opis lokalizacji..."
              maxLength={1000}
              rows={3}
              disabled={isLoading}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-0"
              aria-describedby="location-desc-hint"
            />
            <p id="location-desc-hint" className="mt-1 text-xs text-gray-500">
              {description.length}/1000 znaków
            </p>
          </div>

          {(validationError || error) && (
            <div className="rounded-md bg-red-50 p-3 border border-red-200" role="alert">
              <p id="form-error" className="text-sm text-red-600 font-medium">
                {validationError || error}
              </p>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Anuluj
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Zapisywanie..." : mode === "create" ? "Utwórz" : "Zaktualizuj"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
