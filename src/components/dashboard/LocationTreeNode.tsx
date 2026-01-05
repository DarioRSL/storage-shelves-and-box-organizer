import React from "react";
import { useStore } from "@nanostores/react";
import { selectedLocationId, expandedLocationIds } from "@/stores/dashboard";
import { useDashboard } from "@/contexts/DashboardContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronRight, Folder, FolderOpen, MoreVertical, Plus, Trash2, Edit2 } from "lucide-react";
import type { LocationTreeNode as LocationTreeNodeType } from "@/components/hooks/useLocations";

interface LocationTreeNodeProps {
  location: LocationTreeNodeType;
  level: number;
  onSelect: (locationId: string) => void;
  onAddChild: (parentId: string) => void;
}

/**
 * Recursive location tree node component
 * Supports expand/collapse, selection, and context menu actions
 */
export default function LocationTreeNode({ location, level, onSelect, onAddChild }: LocationTreeNodeProps) {
  const $selectedLocationId = useStore(selectedLocationId);
  const $expandedLocationIds = useStore(expandedLocationIds);
  const { actions } = useDashboard();
  const isSelected = $selectedLocationId === location.id;
  const isExpanded = $expandedLocationIds.has(location.id);
  const hasChildren = location.children && location.children.length > 0;
  const isMaxDepth = level >= 4; // Max 5 levels (0-4)

  const handleToggleExpand = () => {
    if (isExpanded) {
      actions.collapseLocation(location.id);
    } else {
      actions.expandLocation(location.id);
    }
  };

  const handleDelete = () => {
    actions.openDeleteConfirm("location", location.id, location.name);
  };

  const handleEdit = () => {
    actions.openLocationEditor("edit", location.parent_id || undefined, location.id);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect(location.id);
    } else if (e.key === "ArrowRight" && !isExpanded) {
      e.preventDefault();
      handleToggleExpand();
    } else if (e.key === "ArrowLeft" && isExpanded) {
      e.preventDefault();
      handleToggleExpand();
    }
  };

  // Calculate indent based on level
  const indent = level * 16;

  return (
    <div role="treeitem" aria-expanded={hasChildren ? isExpanded : undefined} aria-selected={isSelected}>
      {/* Location item */}
      <div
        style={{ paddingLeft: `${indent}px` }}
        className={`group flex items-center gap-1 rounded-lg py-2 pr-2 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 ${
          isSelected ? "bg-blue-50 text-blue-700" : "hover:bg-gray-100"
        }`}
      >
        {/* Expand/collapse button */}
        {hasChildren ? (
          <button
            onClick={handleToggleExpand}
            className="flex-shrink-0 p-0.5 hover:bg-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-0"
            aria-label={isExpanded ? `Zwiń ${location.name}` : `Rozwiń ${location.name}`}
            aria-expanded={isExpanded}
            aria-controls={`location-children-${location.id}`}
          >
            <ChevronRight
              className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-90" : ""}`}
              aria-hidden="true"
            />
          </button>
        ) : (
          <div className="w-5" aria-hidden="true" />
        )}

        {/* Folder icon */}
        {isExpanded ? (
          <FolderOpen className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
        ) : (
          <Folder className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
        )}

        {/* Location name */}
        <button
          onClick={() => onSelect(location.id)}
          onKeyDown={handleKeyDown}
          className="flex-1 text-left text-sm font-medium cursor-pointer outline-none"
          aria-label={`${location.name}${location.boxCount > 0 ? `, ${location.boxCount} pudełek` : ""}`}
        >
          {location.name}
        </button>

        {/* Box count badge */}
        {location.boxCount > 0 && (
          <span
            className="inline-flex items-center justify-center rounded-full bg-gray-200 px-2 py-0.5 text-xs font-semibold text-gray-700 flex-shrink-0"
            aria-label={`${location.boxCount} pudełek w tej lokalizacji`}
          >
            {location.boxCount}
          </span>
        )}

        {/* Context menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100"
              aria-label="Opcje"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {!isMaxDepth && (
              <DropdownMenuItem onClick={() => onAddChild(location.id)} className="cursor-pointer gap-2">
                <Plus className="h-4 w-4" />
                <span>Dodaj podlokalizację</span>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={handleEdit} className="cursor-pointer gap-2">
              <Edit2 className="h-4 w-4" />
              <span>Edytuj</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDelete} className="cursor-pointer gap-2 text-red-600">
              <Trash2 className="h-4 w-4" />
              <span>Usuń</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Nested children */}
      {isExpanded && hasChildren && (
        <div id={`location-children-${location.id}`} role="group">
          {location.children!.map((child) => (
            <LocationTreeNode
              key={child.id}
              location={child}
              level={level + 1}
              onSelect={onSelect}
              onAddChild={onAddChild}
            />
          ))}
        </div>
      )}
    </div>
  );
}
