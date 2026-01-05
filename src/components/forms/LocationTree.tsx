import { useState, useCallback, useEffect } from "react";
import { ChevronRight, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import type { LocationDto } from "@/types";
import { log } from "@/lib/services/logger";

export interface LocationTreeNode extends LocationDto {
  children?: LocationTreeNode[];
  isExpanded?: boolean;
  isLoading?: boolean;
  isChildrenLoaded?: boolean;
}

export interface LocationTreeProps {
  workspaceId: string;
  selectedId?: string | null;
  onSelect: (locationId: string, locationName: string) => void;
  onLoadComplete?: () => void;
}

/**
 * LocationTree - Hierarchical tree component for location selection.
 * Supports lazy loading of children nodes and recursive expansion.
 * Used within LocationSelector modal for selecting box locations.
 */
export function LocationTree({ workspaceId, selectedId, onSelect, onLoadComplete }: LocationTreeProps) {
  const [nodes, setNodes] = useState<LocationTreeNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load root locations on mount
  useEffect(() => {
    loadRootLocations();
  }, [workspaceId]);

  // Load root locations (no parent_id)
  const loadRootLocations = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await apiFetch<LocationDto[]>(`/api/locations?workspace_id=${workspaceId}`);

      const treeNodes: LocationTreeNode[] = (data || []).map((loc) => ({
        ...loc,
        children: [],
        isExpanded: false,
        isLoading: false,
        isChildrenLoaded: false,
      }));

      setNodes(treeNodes);
      onLoadComplete?.();
    } catch (err) {
      log.error("Failed to load locations", { error: err, workspaceId });
      setError("Failed to load locations");
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, onLoadComplete]);

  // Load children for a specific node
  const loadChildren = useCallback(
    async (nodeId: string) => {
      setNodes((prevNodes) =>
        prevNodes.map((node) => {
          if (node.id === nodeId) {
            return { ...node, isLoading: true };
          }
          return node;
        })
      );

      try {
        const data = await apiFetch<LocationDto[]>(`/api/locations?workspace_id=${workspaceId}&parent_id=${nodeId}`);

        const childNodes: LocationTreeNode[] = (data || []).map((loc) => ({
          ...loc,
          children: [],
          isExpanded: false,
          isLoading: false,
          isChildrenLoaded: false,
        }));

        setNodes((prevNodes) =>
          prevNodes.map((node) => {
            if (node.id === nodeId) {
              return {
                ...node,
                children: childNodes,
                isLoading: false,
                isChildrenLoaded: true,
                isExpanded: true,
              };
            }
            return node;
          })
        );
      } catch (err) {
        log.error("Failed to load children", { error: err, nodeId, workspaceId });
        setNodes((prevNodes) =>
          prevNodes.map((node) => {
            if (node.id === nodeId) {
              return { ...node, isLoading: false };
            }
            return node;
          })
        );
      }
    },
    [workspaceId]
  );

  // Toggle node expansion
  const handleToggle = useCallback(
    (nodeId: string) => {
      setNodes((prevNodes) =>
        prevNodes.map((node) => {
          if (node.id === nodeId) {
            const shouldExpand = !node.isExpanded;
            if (shouldExpand && !node.isChildrenLoaded) {
              loadChildren(nodeId);
            }
            return { ...node, isExpanded: shouldExpand };
          }
          return node;
        })
      );
    },
    [loadChildren]
  );

  // Render single tree node
  const renderNode = (node: LocationTreeNode, depth = 0) => {
    const hasChildren = (node.children && node.children.length > 0) || true; // Assume can have children
    const isSelected = selectedId === node.id;

    return (
      <div key={node.id}>
        <div
          className={`flex items-center gap-2 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-pointer transition-colors ${
            isSelected ? "bg-blue-50 dark:bg-blue-900/20 border-l-2 border-blue-500" : ""
          }`}
          style={{ paddingLeft: `${depth * 20 + 16}px` }}
        >
          {/* Expand/collapse button */}
          <button
            type="button"
            onClick={() => handleToggle(node.id)}
            className={`flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 ${
              !hasChildren ? "opacity-0 cursor-default" : ""
            }`}
            aria-label={node.isExpanded ? "Collapse" : "Expand"}
            disabled={!hasChildren}
          >
            <ChevronRight className={`h-4 w-4 transition-transform ${node.isExpanded ? "rotate-90" : ""}`} />
          </button>

          {/* Loading indicator */}
          {node.isLoading && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}

          {/* Location name */}
          <button
            type="button"
            onClick={() => onSelect(node.id, node.name)}
            className={`flex-1 text-left text-sm font-medium transition-colors ${
              isSelected
                ? "text-blue-700 dark:text-blue-300"
                : "text-gray-900 dark:text-gray-100 hover:text-gray-700 dark:hover:text-gray-200"
            }`}
          >
            {node.name}
          </button>

          {/* Optional: Show count of items in location */}
          <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
            {/* Box count would go here if available from API */}
          </span>
        </div>

        {/* Render children if expanded */}
        {node.isExpanded && node.children && node.children.length > 0 && (
          <div>{node.children.map((child) => renderNode(child, depth + 1))}</div>
        )}
      </div>
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
        <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Ładowanie lokacji...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-md">
        <p className="text-sm text-red-700 dark:text-red-400">Nie udało się załadować lokacji</p>
        <button
          type="button"
          onClick={loadRootLocations}
          className="mt-2 text-sm text-red-600 dark:text-red-400 hover:underline"
        >
          Spróbuj ponownie
        </button>
      </div>
    );
  }

  // Empty state
  if (nodes.length === 0) {
    return (
      <div className="p-4 text-center">
        <p className="text-sm text-gray-600 dark:text-gray-400">Brak dostępnych lokacji. Utwórz najpierw lokację.</p>
      </div>
    );
  }

  // Tree view
  return (
    <div className="max-h-96 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-md">
      {nodes.map((node) => renderNode(node))}
    </div>
  );
}
