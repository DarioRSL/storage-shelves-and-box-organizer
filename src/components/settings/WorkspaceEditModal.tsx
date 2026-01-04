import { useState, useEffect } from "react";
import type { WorkspaceDto } from "../../types";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

interface WorkspaceEditModalProps {
  workspace: WorkspaceDto;
  isOpen: boolean;
  onClose: () => void;
  onSave: (workspaceId: string, newName: string) => Promise<void>;
  isLoading?: boolean;
}

export function WorkspaceEditModal({ workspace, isOpen, onClose, onSave, isLoading = false }: WorkspaceEditModalProps) {
  const [name, setName] = useState(workspace.name);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName(workspace.name);
      setError(null);
    }
  }, [isOpen, workspace.name]);

  const isNameValid = name.trim().length > 0 && name.length <= 255;
  const hasChanges = name.trim() !== workspace.name;

  const handleSave = async () => {
    if (!isNameValid) {
      setError("Workspace name is required and must be less than 255 characters");
      return;
    }

    if (!hasChanges) {
      onClose();
      return;
    }

    setError(null);

    try {
      await onSave(workspace.id, name.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update workspace");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && isNameValid && hasChanges && !isLoading) {
      handleSave();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Workspace</DialogTitle>
          <DialogDescription>Change the name of your workspace. This will be visible to all members.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-workspace-name">Workspace Name</Label>
            <Input
              id="edit-workspace-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="e.g., Home Storage, Office Supplies"
              disabled={isLoading}
              maxLength={255}
              className={error ? "border-destructive" : ""}
              autoFocus
              aria-describedby={error ? "edit-workspace-name-error" : undefined}
            />
            {error && (
              <p className="text-sm text-destructive" id="edit-workspace-name-error">
                {error}
              </p>
            )}
            <p className="text-xs text-muted-foreground">{name.length}/255 characters</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!isNameValid || !hasChanges || isLoading}>
            {isLoading ? (
              <>
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
