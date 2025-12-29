import React from "react";
import type { LocationDto, GetLocationsQuery } from "@/types";
import { apiFetch, getUserFriendlyErrorMessage, logError } from "@/lib/api-client";

/**
 * Represents a location in the tree structure with view model fields
 */
export interface LocationTreeNode extends LocationDto {
  boxCount: number;
  isExpanded: boolean;
  isLoading: boolean;
  level: number;
  children?: LocationTreeNode[];
}

/**
 * Hook for fetching locations and managing the hierarchical tree
 * @param workspaceId - Current workspace ID
 * @param parentId - Optional parent location ID (null for root)
 */
export function useLocations(workspaceId: string, parentId?: string | null) {
  const [locations, setLocations] = React.useState<LocationTreeNode[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchLocations = React.useCallback(async () => {
    if (!workspaceId) return;

    try {
      setIsLoading(true);
      setError(null);
      const params = new URLSearchParams({ workspace_id: workspaceId });
      if (parentId) params.set("parent_id", parentId);

      const data = await apiFetch<LocationDto[]>(`/api/locations?${params}`);

      // Transform to LocationTreeNode
      const nodes: LocationTreeNode[] = data.map((loc: LocationDto) => ({
        ...loc,
        boxCount: 0, // Will be set from boxes data
        isExpanded: false,
        isLoading: false,
        level: loc.path.split(".").length - 1,
      }));

      setLocations(nodes);
    } catch (err) {
      const message = getUserFriendlyErrorMessage(err as Error);
      setError(message);
      logError("[useLocations]", err);
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, parentId]);

  React.useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  return { locations, isLoading, error, refetch: fetchLocations };
}
