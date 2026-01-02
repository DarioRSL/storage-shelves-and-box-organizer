import type { WorkspaceWithOwnershipInfo } from "../../types";
import { WorkspaceCard } from "./WorkspaceCard";
import { Button } from "../ui/button";

interface WorkspaceManagementSectionProps {
  workspaces: WorkspaceWithOwnershipInfo[];
  currentUserId: string;
  onCreateNew: () => void;
  onEdit: (workspaceId: string) => void;
  onDelete: (workspaceId: string) => void;
  isLoading?: boolean;
}

export function WorkspaceManagementSection({
  workspaces,
  onCreateNew,
  onEdit,
  isLoading = false,
}: WorkspaceManagementSectionProps) {
  return (
    <section className="space-y-4 rounded-lg border p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Przestrzenie Robocze</h3>
          <p className="text-sm text-muted-foreground">Zarządzaj swoimi przestrzeniami roboczymi i organizuj przedmioty</p>
        </div>
        <Button onClick={onCreateNew} disabled={isLoading}>
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
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Utwórz Przestrzeń
        </Button>
      </div>

      <div className="space-y-3">
        {workspaces.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Nie masz jeszcze żadnych przestrzeni roboczych. Utwórz pierwszą, aby rozpocząć.
            </p>
          </div>
        ) : (
          workspaces.map((workspace) => (
            <WorkspaceCard
              key={workspace.id}
              workspace={workspace}
              isOwner={workspace.isOwner}
              onEdit={onEdit}
            />
          ))
        )}
      </div>
    </section>
  );
}
