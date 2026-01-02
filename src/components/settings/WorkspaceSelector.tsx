import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import type { WorkspaceWithOwnershipInfo } from "../../types";

interface WorkspaceSelectorProps {
  workspaces: WorkspaceWithOwnershipInfo[];
  selectedWorkspaceId: string | null;
  onWorkspaceChange: (workspaceId: string) => void;
  label?: string;
  showOwnershipInfo?: boolean;
}

/**
 * Workspace selector dropdown for Settings page
 * Allows switching the current workspace context
 */
export function WorkspaceSelector({
  workspaces,
  selectedWorkspaceId,
  onWorkspaceChange,
  label = "Aktualna przestrzeń robocza",
  showOwnershipInfo = true
}: WorkspaceSelectorProps) {
  if (workspaces.length === 0) {
    return null;
  }

  const selectedWorkspace = workspaces.find((w) => w.id === selectedWorkspaceId);

  return (
    <div className="space-y-2">
      <Label htmlFor="workspace-select">{label}</Label>
      <Select value={selectedWorkspaceId || undefined} onValueChange={onWorkspaceChange}>
        <SelectTrigger id="workspace-select" className="w-full">
          <SelectValue placeholder="Wybierz przestrzeń">{selectedWorkspace?.name || "Wybierz przestrzeń"}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {workspaces.map((workspace) => (
            <SelectItem key={workspace.id} value={workspace.id}>
              <div className="flex items-center justify-between gap-2">
                <span>{workspace.name}</span>
                {workspace.isOwner && <span className="text-xs text-muted-foreground">(Właściciel)</span>}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {showOwnershipInfo && (
        <p className="text-xs text-muted-foreground">
          {selectedWorkspace?.isOwner ? "Jesteś właścicielem tej przestrzeni roboczej" : "Jesteś członkiem tej przestrzeni roboczej"}
        </p>
      )}
    </div>
  );
}
