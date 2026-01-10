import React from "react";
import type { WorkspaceDto } from "@/types";
import { currentWorkspaceId } from "@/stores/dashboard";
import { apiFetch, getUserFriendlyErrorMessage, logError } from "@/lib/api-client";

/**
 * Hook for fetching and managing user's workspaces
 * Automatically sets first workspace as current if none is selected
 * Centralized error handling via apiFetch
 */
export function useWorkspaces() {
  const [workspaces, setWorkspaces] = React.useState<WorkspaceDto[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function fetchWorkspaces() {
      try {
        setIsLoading(true);
        setError(null);
        const data = await apiFetch<WorkspaceDto[]>("/api/workspaces");
        setWorkspaces(data);

        // Auto-select first workspace if none selected OR if stored workspace doesn't exist
        const storedWorkspaceId = currentWorkspaceId.get();
        const workspaceExists = storedWorkspaceId && data.some((ws) => ws.id === storedWorkspaceId);

        if (data.length > 0 && !workspaceExists) {
          currentWorkspaceId.set(data[0].id);
        }
      } catch (err) {
        const message = getUserFriendlyErrorMessage(err as Error);
        setError(message);
        logError("useWorkspaces", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchWorkspaces();
  }, []);

  return { workspaces, isLoading, error };
}
