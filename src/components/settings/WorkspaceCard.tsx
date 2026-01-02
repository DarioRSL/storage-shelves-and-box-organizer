import type { WorkspaceWithOwnershipInfo } from "../../types";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";

interface WorkspaceCardProps {
  workspace: WorkspaceWithOwnershipInfo;
  isOwner: boolean;
  onEdit: (workspaceId: string) => void;
  onDelete: (workspaceId: string) => void;
}

export function WorkspaceCard({ workspace, isOwner, onEdit, onDelete }: WorkspaceCardProps) {
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
                Owner
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {workspace.memberCount} {workspace.memberCount === 1 ? "member" : "members"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          onClick={() => onEdit(workspace.id)}
          variant="outline"
          size="sm"
          aria-label={`Edit workspace ${workspace.name}`}
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
          Edit
        </Button>

        {isOwner && (
          <Button
            onClick={() => onDelete(workspace.id)}
            variant="destructive"
            size="sm"
            aria-label={`Delete workspace ${workspace.name}`}
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
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            Delete
          </Button>
        )}
      </div>
    </div>
  );
}
