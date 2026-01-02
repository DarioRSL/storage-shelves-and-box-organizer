import type { WorkspaceWithOwnershipInfo } from "../../types";
import { Button } from "../ui/button";

interface DangerZoneSectionProps {
  currentWorkspace: WorkspaceWithOwnershipInfo | null;
  currentUserId: string;
  onDeleteWorkspace: () => void;
  onDeleteAccount: () => void;
}

export function DangerZoneSection({
  currentWorkspace,
  currentUserId,
  onDeleteWorkspace,
  onDeleteAccount,
}: DangerZoneSectionProps) {
  const canDeleteWorkspace = currentWorkspace?.isOwner ?? false;

  return (
    <section className="space-y-4 rounded-lg border-2 border-destructive/50 bg-destructive/5 p-6">
      <div>
        <h3 className="text-lg font-semibold text-destructive">Danger Zone</h3>
        <p className="text-sm text-muted-foreground">Irreversible and destructive actions</p>
      </div>

      <div className="space-y-4">
        {currentWorkspace && canDeleteWorkspace && (
          <div className="flex items-center justify-between rounded-lg border bg-background p-4">
            <div className="space-y-1">
              <h4 className="font-medium">Delete Workspace</h4>
              <p className="text-sm text-muted-foreground">
                Permanently delete "{currentWorkspace.name}" and all its data including boxes, locations, and QR codes.
                This action cannot be undone.
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={onDeleteWorkspace}
              className="ml-4 shrink-0"
              aria-label={`Delete workspace ${currentWorkspace.name}`}
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
              Delete Workspace
            </Button>
          </div>
        )}

        <div className="flex items-center justify-between rounded-lg border bg-background p-4">
          <div className="space-y-1">
            <h4 className="font-medium">Delete Account</h4>
            <p className="text-sm text-muted-foreground">
              Permanently delete your account and all associated data. All workspaces you own will be deleted. This
              action cannot be undone.
            </p>
          </div>
          <Button variant="destructive" onClick={onDeleteAccount} className="ml-4 shrink-0" aria-label="Delete account">
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
            Delete Account
          </Button>
        </div>
      </div>
    </section>
  );
}
