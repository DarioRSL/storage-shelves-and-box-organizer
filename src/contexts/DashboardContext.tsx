import React from "react";
import type {
  WorkspaceDto,
  CreateLocationRequest,
  CreateBoxRequest,
  UpdateBoxRequest,
} from "@/types";

/**
 * Represents the state of the dashboard
 */
export interface DashboardState {
  // Workspace context
  currentWorkspaceId: string | null;
  userWorkspaces: WorkspaceDto[];

  // Location selection and hierarchy
  selectedLocationId: string | null; // null = "Unassigned"
  locations: any[]; // LocationTreeNode[]
  expandedLocationIds: Set<string>;

  // Search state
  searchQuery: string;
  searchResults: any[]; // BoxDto[]
  isSearchActive: boolean;

  // Boxes data
  boxes: any[]; // BoxDto[]
  totalBoxesCount: number;

  // Loading states
  isLoadingLocations: boolean;
  isLoadingBoxes: boolean;
  isLoadingWorkspaces: boolean;

  // UI state
  selectedBoxId: string | null;
  activeModal: "location-editor" | "box-editor" | "delete-confirm" | null;
  modalData: {
    mode: "create" | "edit";
    itemId?: string;
    parentId?: string;
    itemType?: "location" | "box";
  };

  // Error handling
  error: string | null;
  lastError: { message: string; timestamp: number } | null;
}

/**
 * Actions available in the dashboard context
 */
export interface DashboardContextType {
  state: DashboardState;
  actions: {
    selectLocation: (locationId: string | null) => void;
    expandLocation: (locationId: string) => void;
    collapseLocation: (locationId: string) => void;
    setSearchQuery: (query: string) => void;
    clearSearch: () => void;

    openLocationEditor: (mode: "create" | "edit", parentId?: string, itemId?: string) => void;
    closeLocationEditor: () => void;
    submitLocationEditor: (data: CreateLocationRequest) => Promise<void>;

    openBoxEditor: (mode: "create" | "edit", itemId?: string) => void;
    closeBoxEditor: () => void;
    submitBoxEditor: (data: CreateBoxRequest | UpdateBoxRequest) => Promise<void>;

    openDeleteConfirm: (type: "location" | "box", itemId: string, itemName?: string) => void;
    closeDeleteConfirm: () => void;
    deleteLocation: (locationId: string) => Promise<void>;
    deleteBox: (boxId: string) => Promise<void>;

    switchWorkspace: (workspaceId: string) => Promise<void>;

    refetchLocations: (parentId?: string) => Promise<void>;
    refetchBoxes: () => Promise<void>;

    setError: (error: string | null) => void;
  };
}

/**
 * Create the context for dashboard state and actions
 */
export const DashboardContext = React.createContext<DashboardContextType | undefined>(undefined);

/**
 * Hook to use the dashboard context
 * Throws error if used outside of DashboardProvider
 */
export function useDashboard() {
  const context = React.useContext(DashboardContext);
  if (!context) {
    throw new Error("useDashboard must be used within DashboardProvider");
  }
  return context;
}
