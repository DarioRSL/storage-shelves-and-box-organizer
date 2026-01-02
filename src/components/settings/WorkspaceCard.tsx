import type { WorkspaceWithOwnershipInfo } from "../../types";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";

interface WorkspaceCardProps {
  workspace: WorkspaceWithOwnershipInfo;
  isOwner: boolean;
  onEdit: (workspaceId: string) => void;
  onDelete?: (workspaceId: string) => void;
}

export function WorkspaceCard({ workspace, isOwner, onEdit }: WorkspaceCardProps) {
  const initials = workspace.name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex items-center justify-between rounded-lg border p-4 hover:bg-accent/50 transition-colors">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 text-sm font-semibold text-white">
          {initials}
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">{workspace.name}</h3>
            {isOwner && (
              <Badge variant="secondary" className="text-xs">
                Właściciel
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {workspace.memberCount} {workspace.memberCount === 1 ? "członek" : "członków"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          onClick={() => onEdit(workspace.id)}
          variant="outline"
          size="sm"
          aria-label={`Edytuj przestrzeń ${workspace.name}`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="mr-2"
          >
            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
          </svg>
          Edytuj
        </Button>
      </div>
    </div>
  );
}
