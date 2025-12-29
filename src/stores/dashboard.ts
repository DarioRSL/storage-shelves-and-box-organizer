import { atom } from "nanostores";

/**
 * Global dashboard state atoms using Nano Stores.
 * These manage global data that multiple components need access to.
 */

/** Current workspace ID being viewed */
export const currentWorkspaceId = atom<string | null>(null);

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
