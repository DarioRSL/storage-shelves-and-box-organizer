import { useStore } from "@nanostores/react";
import { currentWorkspaceId, userWorkspaces } from "@/stores/dashboard";
import { useDashboard } from "@/contexts/DashboardContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";

/**
 * Workspace selector dropdown
 * Allows switching between user's workspaces
 */
export default function WorkspaceSelector() {
  const $workspaceId = useStore(currentWorkspaceId);
  const $workspaces = useStore(userWorkspaces);
  const { actions } = useDashboard();

  const currentWorkspace = $workspaces.find((w) => w.id === $workspaceId);

  // Hide selector if only one workspace
  if ($workspaces.length <= 1) {
    return (
      <div
        className="text-sm font-medium text-gray-700"
        aria-label={`Aktywna przestrzeń: ${currentWorkspace?.name || "Workspace"}`}
      >
        {currentWorkspace?.name || "Workspace"}
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          aria-label={`Zmień przestrzeń. Aktualnie: ${currentWorkspace?.name}`}
        >
          <span className="max-w-[200px] truncate text-sm">{currentWorkspace?.name}</span>
          <ChevronDown className="h-4 w-4 opacity-50" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Moje przestrzenie</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {$workspaces.map((workspace) => (
          <DropdownMenuItem
            key={workspace.id}
            onClick={() => actions.switchWorkspace(workspace.id)}
            className="cursor-pointer"
            data-state={workspace.id === $workspaceId ? "checked" : undefined}
            aria-label={`${workspace.name}${workspace.id === $workspaceId ? " (aktywna)" : ""}`}
            aria-current={workspace.id === $workspaceId ? "true" : undefined}
          >
            <div className="flex items-center justify-between gap-2 w-full">
              <span className="truncate">{workspace.name}</span>
              {workspace.id === $workspaceId && (
                <span className="text-blue-600" aria-hidden="true">
                  ✓
                </span>
              )}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
