import React from "react";
import { useStore } from "@nanostores/react";
import {
  currentWorkspaceId,
  selectedLocationId,
  searchQuery,
  expandedLocationIds,
  userWorkspaces,
  workspaceLocations,
  currentBoxes,
  totalBoxesCount,
  userProfile,
} from "@/stores/dashboard";
import { DashboardContext, type DashboardContextType, type DashboardState } from "@/contexts/DashboardContext";
import { useWorkspaces } from "@/components/hooks/useWorkspaces";
import { useLocations, type LocationTreeNode } from "@/components/hooks/useLocations";
import { useBoxes, type BoxListItem } from "@/components/hooks/useBoxes";
import type { CreateLocationRequest, CreateBoxRequest, UpdateBoxRequest } from "@/types";
import { apiFetch, getUserFriendlyErrorMessage, logError, shouldRedirectToLogin } from "@/lib/api-client";

import DashboardHeader from "./DashboardHeader";
import DashboardContent from "./DashboardContent";
import LocationEditorModal from "./LocationEditorModal";
import BoxEditorModal from "./BoxEditorModal";
import DeleteConfirmationDialog from "./DeleteConfirmationDialog";

/**
 * Main dashboard container component
 * Manages all state, API calls, and provides context to child components
 */
export default function DashboardContainer() {
  // Global state atoms
  const $workspaceId = useStore(currentWorkspaceId);
  const $selectedLocationId = useStore(selectedLocationId);
  const $searchQuery = useStore(searchQuery);
  const $expandedLocationIds = useStore(expandedLocationIds);
  const $userWorkspaces = useStore(userWorkspaces);
  const $userProfile = useStore(userProfile);

  // API hooks
  const { workspaces, isLoading: isLoadingWorkspaces, error: workspacesError } = useWorkspaces();
  const {
    locations,
    isLoading: isLoadingLocations,
    error: locationsError,
    refetch: refetchLocations,
  } = useLocations($workspaceId || "", null);
  const {
    boxes,
    totalCount,
    isLoading: isLoadingBoxes,
    error: boxesError,
    refetch: refetchBoxes,
  } = useBoxes($workspaceId || "", $selectedLocationId || undefined, $searchQuery || undefined);

  // Local UI state
  const [activeModal, setActiveModal] = React.useState<"location-editor" | "box-editor" | "delete-confirm" | null>(
    null
  );
  const [modalData, setModalData] = React.useState<{
    mode: "create" | "edit";
    itemId?: string;
    parentId?: string;
    itemType?: "location" | "box";
  }>({
    mode: "create",
  });
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Sync workspaces to global store
  React.useEffect(() => {
    userWorkspaces.set(workspaces);
  }, [workspaces]);

  // Sync locations to global store
  React.useEffect(() => {
    workspaceLocations.set(locations);
  }, [locations]);

  // Sync boxes to global store
  React.useEffect(() => {
    currentBoxes.set(boxes);
    totalBoxesCount.set(totalCount);
  }, [boxes, totalCount]);

  // Fetch user profile on mount
  React.useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch("/api/profiles/me", {
          credentials: "include", // Send session cookie
        });
        if (!res.ok) throw new Error("Nie udało się pobrać profilu");
        const profile = await res.json();
        userProfile.set(profile);
      } catch (err) {
        console.error("[DashboardContainer] Błąd pobierania profilu:", err);
      }
    }
    fetchProfile();
  }, []);

  // Context actions
  const actions: DashboardContextType["actions"] = {
    selectLocation: (locationId: string | null) => {
      selectedLocationId.set(locationId);
    },

    expandLocation: (locationId: string) => {
      const expanded = new Set($expandedLocationIds);
      expanded.add(locationId);
      expandedLocationIds.set(expanded);
    },

    collapseLocation: (locationId: string) => {
      const expanded = new Set($expandedLocationIds);
      expanded.delete(locationId);
      expandedLocationIds.set(expanded);
    },

    setSearchQuery: (query: string) => {
      searchQuery.set(query);
    },

    clearSearch: () => {
      searchQuery.set("");
    },

    openLocationEditor: (mode: "create" | "edit", parentId?: string, itemId?: string) => {
      setModalData({ mode, parentId, itemId, itemType: "location" });
      setActiveModal("location-editor");
    },

    closeLocationEditor: () => {
      setActiveModal(null);
      setModalData({ mode: "create" });
    },

    submitLocationEditor: async (data: CreateLocationRequest) => {
      try {
        setIsSubmitting(true);
        setError(null);

        const method = modalData.mode === "edit" ? "PATCH" : "POST";

        await apiFetch(`/api/locations${modalData.mode === "edit" && modalData.itemId ? `/${modalData.itemId}` : ""}`, {
          method,
          body: JSON.stringify(data),
        });

        await refetchLocations();
        setActiveModal(null);
        setModalData({ mode: "create" });
      } catch (err) {
        if (shouldRedirectToLogin(err)) {
          window.location.href = "/auth";
          return;
        }
        const message = getUserFriendlyErrorMessage(err as Error);
        setError(message);
        logError("[DashboardContainer] submitLocationEditor", err);
      } finally {
        setIsSubmitting(false);
      }
    },

    openBoxEditor: (mode: "create" | "edit", itemId?: string) => {
      setModalData({ mode, itemId, itemType: "box" });
      setActiveModal("box-editor");
    },

    closeBoxEditor: () => {
      setActiveModal(null);
      setModalData({ mode: "create" });
    },

    openDeleteConfirm: (type: "location" | "box", itemId: string, itemName?: string) => {
      setModalData({ mode: "create", itemType: type, itemId });
      setActiveModal("delete-confirm");
    },

    closeDeleteConfirm: () => {
      setActiveModal(null);
      setModalData({ mode: "create" });
    },

    submitBoxEditor: async (data: CreateBoxRequest | UpdateBoxRequest) => {
      try {
        setIsSubmitting(true);
        setError(null);

        const method = modalData.mode === "edit" ? "PATCH" : "POST";

        await apiFetch(`/api/boxes${modalData.mode === "edit" && modalData.itemId ? `/${modalData.itemId}` : ""}`, {
          method,
          body: JSON.stringify(data),
        });

        await refetchBoxes();
        setActiveModal(null);
        setModalData({ mode: "create" });
      } catch (err) {
        if (shouldRedirectToLogin(err)) {
          window.location.href = "/auth";
          return;
        }
        const message = getUserFriendlyErrorMessage(err as Error);
        setError(message);
        logError("[DashboardContainer] submitBoxEditor", err);
      } finally {
        setIsSubmitting(false);
      }
    },

    deleteLocation: async (locationId: string) => {
      try {
        setIsSubmitting(true);
        setError(null);

        await apiFetch(`/api/locations/${locationId}`, {
          method: "DELETE",
        });

        await refetchLocations();
        await refetchBoxes();
        setActiveModal(null);
      } catch (err) {
        if (shouldRedirectToLogin(err)) {
          window.location.href = "/auth";
          return;
        }
        const message = getUserFriendlyErrorMessage(err as Error);
        setError(message);
        logError("[DashboardContainer] deleteLocation", err);
      } finally {
        setIsSubmitting(false);
      }
    },

    deleteBox: async (boxId: string) => {
      try {
        setIsSubmitting(true);
        setError(null);

        await apiFetch(`/api/boxes/${boxId}`, {
          method: "DELETE",
        });

        await refetchBoxes();
        setActiveModal(null);
      } catch (err) {
        if (shouldRedirectToLogin(err)) {
          window.location.href = "/auth";
          return;
        }
        const message = getUserFriendlyErrorMessage(err as Error);
        setError(message);
        logError("[DashboardContainer] deleteBox", err);
      } finally {
        setIsSubmitting(false);
      }
    },

    switchWorkspace: async (workspaceId: string) => {
      currentWorkspaceId.set(workspaceId);
      selectedLocationId.set(null);
      searchQuery.set("");
      expandedLocationIds.set(new Set());
      await refetchLocations();
      await refetchBoxes();
    },

    refetchLocations,

    refetchBoxes,

    setError: (err: string | null) => {
      setError(err);
    },
  };

  const state: DashboardState = {
    currentWorkspaceId: $workspaceId,
    userWorkspaces: $userWorkspaces,
    selectedLocationId: $selectedLocationId,
    locations,
    expandedLocationIds: $expandedLocationIds,
    searchQuery: $searchQuery,
    searchResults: boxes,
    isSearchActive: $searchQuery.length > 0,
    boxes,
    totalBoxesCount: totalCount,
    isLoadingLocations,
    isLoadingBoxes,
    isLoadingWorkspaces,
    selectedBoxId: null,
    activeModal,
    modalData,
    error: error || workspacesError || locationsError || boxesError,
    lastError: error ? { message: error, timestamp: Date.now() } : null,
  };

  const contextValue: DashboardContextType = {
    state,
    actions,
  };

  return (
    <DashboardContext.Provider value={contextValue}>
      <div className="min-h-screen bg-background">
        <DashboardHeader />
        <DashboardContent />

        <LocationEditorModal
          isOpen={activeModal === "location-editor"}
          mode={modalData.mode}
          workspaceId={$workspaceId || ""}
          parentLocationId={modalData.parentId}
          onSubmit={actions.submitLocationEditor}
          onClose={actions.closeLocationEditor}
          isLoading={isSubmitting}
          error={error}
        />

        <BoxEditorModal
          isOpen={activeModal === "box-editor"}
          mode={modalData.mode}
          workspaceId={$workspaceId || ""}
          selectedLocationId={$selectedLocationId}
          onSubmit={actions.submitBoxEditor}
          onClose={actions.closeBoxEditor}
          isLoading={isSubmitting}
          error={error}
        />

        <DeleteConfirmationDialog
          isOpen={activeModal === "delete-confirm"}
          type={modalData.itemType === "location" ? "location" : "box"}
          title={`Usunąć ${modalData.itemType === "location" ? "lokalizację" : "pudełko"}?`}
          description={`Czy na pewno chcesz usunąć tę ${modalData.itemType === "location" ? "lokalizację" : "pudełko"}?`}
          itemName=""
          isLoading={isSubmitting}
          onConfirm={() => {
            if (modalData.itemType === "location" && modalData.itemId) {
              actions.deleteLocation(modalData.itemId);
            } else if (modalData.itemType === "box" && modalData.itemId) {
              actions.deleteBox(modalData.itemId);
            }
          }}
          onCancel={actions.closeDeleteConfirm}
        />
      </div>
    </DashboardContext.Provider>
  );
}
