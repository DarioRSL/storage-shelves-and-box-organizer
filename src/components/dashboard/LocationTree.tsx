import React from "react";
import { useDashboard } from "@/contexts/DashboardContext";
import LocationTreeNode from "./LocationTreeNode";
import { Button } from "@/components/ui/button";
import { Plus, Folder } from "lucide-react";

/**
 * Hierarchical location tree component
 * Supports up to 5 levels of nesting
 * Shows special "Unassigned" node for boxes without location
 */
export default function LocationTree() {
  const { state, actions } = useDashboard();
  const [isUnassignedSelected, setIsUnassignedSelected] = React.useState(state.selectedLocationId === null);

  const handleUnassignedClick = () => {
    actions.selectLocation(null);
    setIsUnassignedSelected(true);
  };

  const handleUnassignedKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleUnassignedClick();
    }
  };

  const handleAddRootLocation = () => {
    actions.openLocationEditor("create", undefined, undefined);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Add root location button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleAddRootLocation}
        className="w-full justify-start gap-2 text-foreground"
        aria-label="Dodaj nową lokalizację główną"
      >
        <Plus className="h-4 w-4" />
        <span>Nowa lokalizacja</span>
      </Button>

      {/* Unassigned section */}
      <div
        onClick={handleUnassignedClick}
        onKeyDown={handleUnassignedKeyDown}
        className={`flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-0 ${
          isUnassignedSelected ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"
        }`}
        role="button"
        tabIndex={0}
        aria-selected={isUnassignedSelected}
        aria-label="Pudełka bez przypisanej lokalizacji"
      >
        <Folder className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
        <span className="flex-1 text-sm font-medium">Bez lokalizacji</span>
        {state.boxes.filter((b) => !b.location_id).length > 0 && (
          <span
            className="inline-flex items-center justify-center rounded-full bg-gray-200 px-2 py-0.5 text-xs font-semibold text-gray-700"
            aria-label={`${state.boxes.filter((b) => !b.location_id).length} pudełek bez lokalizacji`}
          >
            {state.boxes.filter((b) => !b.location_id).length}
          </span>
        )}
      </div>

      {/* Location tree items */}
      <div className="space-y-0" role="tree" aria-label="Hierarchia lokalizacji">
        {state.locations.length === 0 && (
          <p className="px-3 py-2 text-xs text-gray-500">
            {state.isLoadingLocations ? "Ładowanie lokalizacji..." : "Brak lokalizacji"}
          </p>
        )}

        {state.locations.map((location) => (
          <LocationTreeNode
            key={location.id}
            location={location}
            level={0}
            onSelect={(locationId) => {
              actions.selectLocation(locationId);
              setIsUnassignedSelected(false);
            }}
            onAddChild={(parentId) => {
              actions.openLocationEditor("create", parentId);
            }}
          />
        ))}
      </div>
    </div>
  );
}
