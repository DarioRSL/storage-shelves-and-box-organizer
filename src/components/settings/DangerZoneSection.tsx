import type { WorkspaceWithOwnershipInfo } from "../../types";
import { Button } from "../ui/button";
import { WorkspaceSelector } from "./WorkspaceSelector";

interface DangerZoneSectionProps {
  workspaces: WorkspaceWithOwnershipInfo[];
  selectedWorkspaceId: string | null;
  onWorkspaceChange: (workspaceId: string) => void;
  currentUserId: string;
  onDeleteWorkspace: (workspaceId: string) => void;
  onDeleteAccount: () => void;
}

export function DangerZoneSection({
  workspaces,
  selectedWorkspaceId,
  onWorkspaceChange,
  currentUserId,
  onDeleteWorkspace,
  onDeleteAccount,
}: DangerZoneSectionProps) {
  const currentWorkspace = workspaces.find((w) => w.id === selectedWorkspaceId) || null;
  const canDeleteWorkspace = currentWorkspace?.isOwner ?? false;

  return (
    <section className="space-y-4 rounded-lg border-2 border-destructive/50 bg-destructive/5 p-6">
      <div>
        <h3 className="text-lg font-semibold text-destructive">Strefa Niebezpieczna</h3>
        <p className="text-sm text-muted-foreground">Nieodwracalne i destrukcyjne operacje</p>
      </div>

      <div className="space-y-4">
        {/* Delete Workspace Section with integrated selector */}
        <div className="rounded-lg border bg-background p-4 space-y-4">
          <div className="space-y-1">
            <h4 className="font-medium">Usuń Przestrzeń Roboczą</h4>
            <p className="text-sm text-muted-foreground">
              Wybierz przestrzeń roboczą, którą chcesz usunąć. Wszystkie dane włącznie z pudełkami, lokalizacjami i kodami QR zostaną trwale usunięte. Ta operacja jest nieodwracalna.
            </p>
          </div>

          {/* Workspace selector integrated here */}
          <div className="space-y-3">
            <WorkspaceSelector
              workspaces={workspaces}
              selectedWorkspaceId={selectedWorkspaceId}
              onWorkspaceChange={onWorkspaceChange}
              label="Wybierz przestrzeń do usunięcia"
            />

            {currentWorkspace && canDeleteWorkspace && (
              <Button
                variant="destructive"
                onClick={() => onDeleteWorkspace(currentWorkspace.id)}
                className="w-full"
                aria-label={`Usuń przestrzeń ${currentWorkspace.name}`}
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
                Usuń "{currentWorkspace.name}"
              </Button>
            )}

            {currentWorkspace && !canDeleteWorkspace && (
              <p className="text-sm text-muted-foreground">
                Nie możesz usunąć tej przestrzeni roboczej, ponieważ nie jesteś jej właścicielem.
              </p>
            )}

            {!currentWorkspace && workspaces.length > 0 && (
              <p className="text-sm text-muted-foreground">
                Wybierz przestrzeń roboczą z listy powyżej.
              </p>
            )}
          </div>
        </div>

        {/* Delete Account Section */}
        <div className="flex items-center justify-between rounded-lg border bg-background p-4">
          <div className="space-y-1">
            <h4 className="font-medium">Usuń Konto</h4>
            <p className="text-sm text-muted-foreground">
              Trwale usuń swoje konto i wszystkie powiązane dane. Wszystkie przestrzenie robocze, których jesteś właścicielem, zostaną usunięte. Ta operacja jest nieodwracalna.
            </p>
          </div>
          <Button variant="destructive" onClick={onDeleteAccount} className="ml-4 shrink-0" aria-label="Usuń konto">
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
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <line x1="17" y1="8" x2="22" y2="13" />
              <line x1="22" y1="8" x2="17" y2="13" />
            </svg>
            Usuń Konto
          </Button>
        </div>
      </div>
    </section>
  );
}
