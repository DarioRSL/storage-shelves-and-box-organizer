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
import type { CreateBoxRequest, UpdateBoxRequest } from "@/types";
import { log } from "@/lib/services/logger";

interface BoxEditorModalProps {
  isOpen: boolean;
  mode: "create" | "edit";
  workspaceId: string;
  selectedLocationId?: string | null;
  initialValues?: Partial<CreateBoxRequest | UpdateBoxRequest>;
  onSubmit: (data: CreateBoxRequest | UpdateBoxRequest) => Promise<void>;
  onClose: () => void;
  isLoading: boolean;
  error?: string | null;
}

/**
 * Modal for creating/editing boxes
 */
export default function BoxEditorModal({
  isOpen,
  mode,
  workspaceId,
  selectedLocationId,
  initialValues,
  onSubmit,
  onClose,
  isLoading,
  error,
}: BoxEditorModalProps) {
  const [name, setName] = React.useState(initialValues?.name || "");
  const [description, setDescription] = React.useState(initialValues?.description || "");
  const [tags, setTags] = React.useState<string[]>(initialValues?.tags || []);
  const [tagInput, setTagInput] = React.useState("");
  const [validationError, setValidationError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!name.trim()) {
      setValidationError("Nazwa pudełka jest wymagana");
      return;
    }

    if (name.length > 255) {
      setValidationError("Nazwa nie może być dłuższa niż 255 znaków");
      return;
    }

    if (description && description.length > 10000) {
      setValidationError("Opis nie może być dłuższy niż 10000 znaków");
      return;
    }

    try {
      const data: CreateBoxRequest | UpdateBoxRequest = {
        workspace_id: workspaceId,
        name: name.trim(),
        description: description.trim() || null,
        tags: tags.length > 0 ? tags : null,
        location_id: selectedLocationId || null,
      };

      await onSubmit(data);
    } catch (err) {
      log.error("BoxEditorModal submission error", { error: err, workspaceId, mode });
    }
  };

  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && trimmed.length <= 50 && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Nowe pudełko" : "Edytuj pudełko"}</DialogTitle>
          <DialogDescription>
            {mode === "create" ? "Dodaj nowe pudełko do workspace'u" : "Zmień szczegóły pudełka"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="box-name" className="block text-sm font-medium text-gray-700">
              Nazwa{" "}
              <span className="text-red-500" aria-label="wymagane">
                *
              </span>
            </label>
            <Input
              id="box-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="np. Elektronika, Dokumenty..."
              maxLength={255}
              disabled={isLoading}
              className="mt-1"
              aria-required="true"
              aria-describedby={validationError || error ? "form-error" : "box-name-hint"}
            />
            <p id="box-name-hint" className="mt-1 text-xs text-gray-500">
              {name.length}/255 znaków
            </p>
          </div>

          <div>
            <label htmlFor="box-desc" className="block text-sm font-medium text-gray-700">
              Opis
            </label>
            <textarea
              id="box-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Opisz zawartość pudełka..."
              maxLength={10000}
              rows={4}
              disabled={isLoading}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-0"
              aria-describedby="box-desc-hint"
            />
            <p id="box-desc-hint" className="mt-1 text-xs text-gray-500">
              {description.length}/10000 znaków
            </p>
          </div>

          <div>
            <label htmlFor="box-tags" className="block text-sm font-medium text-gray-700">
              Tagi
            </label>
            <div className="mt-1 flex gap-2">
              <Input
                id="box-tags"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="Dodaj tag..."
                maxLength={50}
                disabled={isLoading}
                aria-describedby="box-tags-hint"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleAddTag}
                disabled={!tagInput.trim() || isLoading}
                aria-label="Dodaj tag"
              >
                Dodaj
              </Button>
            </div>
            <p id="box-tags-hint" className="mt-1 text-xs text-gray-500">
              Max 50 znaków na tag
            </p>
            {tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2" role="region" aria-label="Dodane tagi">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-700"
                    role="status"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-400 rounded"
                      aria-label={`Usuń tag ${tag}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
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
