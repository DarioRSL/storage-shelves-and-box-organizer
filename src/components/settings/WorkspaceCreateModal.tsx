import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

interface WorkspaceCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string) => Promise<void>;
  isLoading?: boolean;
}

export function WorkspaceCreateModal({ isOpen, onClose, onCreate, isLoading = false }: WorkspaceCreateModalProps) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setName("");
      setError(null);
    }
  }, [isOpen]);

  const isNameValid = name.trim().length > 0 && name.length <= 255;

  const handleCreate = async () => {
    if (!isNameValid) {
      setError("Workspace name is required and must be less than 255 characters");
      return;
    }

    setError(null);

    try {
      await onCreate(name.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create workspace");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && isNameValid && !isLoading) {
      handleCreate();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Workspace</DialogTitle>
          <DialogDescription>
            Enter a name for your new workspace. You can organize your boxes and locations within workspaces.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="workspace-name">Workspace Name</Label>
            <Input
              id="workspace-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="e.g., Home Storage, Office Supplies"
              disabled={isLoading}
              maxLength={255}
              className={error ? "border-destructive" : ""}
              autoFocus
              aria-describedby={error ? "workspace-name-error" : undefined}
            />
            {error && (
              <p className="text-sm text-destructive" id="workspace-name-error">
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
          <Button onClick={handleCreate} disabled={!isNameValid || isLoading}>
            {isLoading ? (
              <>
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Creating...
              </>
            ) : (
              "Create Workspace"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
