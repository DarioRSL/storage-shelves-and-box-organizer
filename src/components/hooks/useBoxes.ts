import React from "react";
import type { BoxDto } from "@/types";
import { useDebounce } from "./useDebounce";
import { apiFetch, getUserFriendlyErrorMessage, logError } from "@/lib/api-client";

/**
 * Represents a box item in the list with view model fields
 */
export interface BoxListItem extends BoxDto {
  isLoading?: boolean;
  isSelected?: boolean;
  isHovering?: boolean;
}

/**
 * Hook for fetching boxes with search and location filtering
 * @param workspaceId - Current workspace ID
 * @param locationId - Optional location filter (null = unassigned)
 * @param searchQuery - Optional search query
 * @param limit - Pagination limit (default 50)
 * @param offset - Pagination offset (default 0)
 */
export function useBoxes(
  workspaceId: string,
  locationId?: string | null,
  searchQuery?: string,
  limit = 50,
  offset = 0
) {
  const [boxes, setBoxes] = React.useState<BoxListItem[]>([]);
  const [totalCount, setTotalCount] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Debounce search query to avoid excessive API calls
  const debouncedQuery = useDebounce(searchQuery, 300);

  const fetchBoxes = React.useCallback(async () => {
    if (!workspaceId) return;

    // Don't fetch if search query is too short
    if (debouncedQuery && debouncedQuery.length < 3) {
      setBoxes([]);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const params = new URLSearchParams({
        workspace_id: workspaceId,
        limit: limit.toString(),
        offset: offset.toString(),
      });

      if (debouncedQuery) {
        params.set("q", debouncedQuery);
      }

      if (locationId) {
        params.set("location_id", locationId);
      } else if (locationId === null && !debouncedQuery) {
        // "Unassigned" case - boxes without location
        params.set("is_assigned", "false");
      }

      const response = await apiFetch<BoxDto[] | { data: BoxDto[]; total: number }>(`/api/boxes?${params}`);

      const data = Array.isArray(response) ? response : response.data || [];
      const total = !Array.isArray(response) && response.total ? response.total : data.length;

      setBoxes(data);
      setTotalCount(total);
    } catch (err) {
      const message = getUserFriendlyErrorMessage(err as Error);
      setError(message);
      logError("[useBoxes]", err);
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, locationId, debouncedQuery, limit, offset]);

  React.useEffect(() => {
    fetchBoxes();
  }, [fetchBoxes]);

  return { boxes, totalCount, isLoading, error, refetch: fetchBoxes };
}
