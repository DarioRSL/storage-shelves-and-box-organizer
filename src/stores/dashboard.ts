import { atom } from "nanostores";

/**
 * Global dashboard state atoms using Nano Stores.
 * These manage global data that multiple components need access to.
 */

const WORKSPACE_STORAGE_KEY = "currentWorkspaceId";

/**
 * Get initial workspace ID from localStorage (if available)
 */
function getInitialWorkspaceId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(WORKSPACE_STORAGE_KEY);
  } catch {
    return null;
  }
}

/** Current workspace ID being viewed - persisted to localStorage */
export const currentWorkspaceId = atom<string | null>(getInitialWorkspaceId());

// Subscribe to changes and persist to localStorage
if (typeof window !== "undefined") {
  currentWorkspaceId.subscribe((value) => {
    try {
      if (value) {
        localStorage.setItem(WORKSPACE_STORAGE_KEY, value);
      } else {
        localStorage.removeItem(WORKSPACE_STORAGE_KEY);
      }
    } catch {
      // Ignore localStorage errors
    }
  });
}

/** ID of currently selected location (null = "Unassigned") */
export const selectedLocationId = atom<string | null>(null);

/** Current search query */
export const searchQuery = atom<string>("");

/** Set of expanded location IDs in the tree */
export const expandedLocationIds = atom<Set<string>>(new Set());

/** User's workspaces list */
export const userWorkspaces = atom<any[]>([]);

/** All locations for current workspace */
export const workspaceLocations = atom<any[]>([]);

/** Boxes for current view (filtered by location or search) */
export const currentBoxes = atom<any[]>([]);

/** Total count of boxes in workspace */
export const totalBoxesCount = atom<number>(0);

/** Currently logged-in user profile */
export const userProfile = atom<any>(null);
