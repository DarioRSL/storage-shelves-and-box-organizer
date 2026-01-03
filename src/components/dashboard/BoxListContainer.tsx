import { useDashboard } from "@/contexts/DashboardContext";
import BoxList from "./BoxList";
import EmptyState from "./EmptyState";
import { Loader } from "lucide-react";

/**
 * Container for box list with loading state and empty state handling
 */
export default function BoxListContainer() {
  const { state, actions } = useDashboard();

  // Show empty state when there are no boxes and not searching
  const showEmptyState =
    !state.isLoadingBoxes &&
    state.boxes.length === 0 &&
    !state.isSearchActive &&
    state.userWorkspaces.length > 0 &&
    state.currentWorkspaceId;

  // Show "no results" when searching but found nothing
  const showNoResults =
    !state.isLoadingBoxes && state.boxes.length === 0 && state.isSearchActive && state.userWorkspaces.length > 0;

  // Show "no workspace" message when user has no workspaces
  const showNoWorkspace = !state.isLoadingBoxes && (state.userWorkspaces.length === 0 || !state.currentWorkspaceId);

  const showBoxList = state.boxes.length > 0 && state.userWorkspaces.length > 0;

  return (
    <div className="flex h-full flex-col bg-card" role="region" aria-label="Zawartość pudełek">
      {/* Header */}
      <div className="border-b border-border px-6 py-4">
        <h2 className="text-lg font-semibold text-foreground">
          {state.isSearchActive ? "Wyniki wyszukiwania" : "Pudełka"}
        </h2>
        {state.boxes.length > 0 && (
          <p className="text-sm text-muted-foreground" role="status">
            {state.isSearchActive ? "Znaleziono" : "Razem"}: {state.boxes.length}{" "}
            {state.boxes.length === 1 ? "pudełko" : "pudełek"}
          </p>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {state.isLoadingBoxes ? (
          <div
            className="flex h-full items-center justify-center"
            role="status"
            aria-busy="true"
            aria-label="Ładowanie pudełek"
          >
            <div className="flex flex-col items-center gap-2">
              <Loader className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">Ładowanie pudełek...</p>
            </div>
          </div>
        ) : showEmptyState ? (
          <EmptyState
            type="empty-workspace"
            onAddLocation={() => actions.openLocationEditor("create")}
            onAddBox={() => actions.openBoxEditor("create")}
          />
        ) : showNoResults ? (
          <EmptyState
            type="no-results"
            onAddLocation={() => actions.openLocationEditor("create")}
            onAddBox={() => actions.openBoxEditor("create")}
          />
        ) : showNoWorkspace ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 px-6 py-12" role="status">
            <p className="text-sm text-muted-foreground">Wybierz workspace, aby zobaczyć pudełka</p>
          </div>
        ) : showBoxList ? (
          <BoxList />
        ) : null}
      </div>
    </div>
  );
}
