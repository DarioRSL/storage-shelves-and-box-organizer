/**
 * Box Fixtures
 *
 * Predefined box data for testing inventory management.
 * Includes various scenarios: empty boxes, full descriptions, tags, etc.
 */

export interface BoxFixture {
  name: string;
  description?: string;
  tags?: string[];
  location?: string; // Reference to location fixture name
}

/**
 * Electronics box with detailed description
 */
export const ELECTRONICS_BOX: BoxFixture = {
  name: "Electronics",
  description:
    "Old cables, chargers, and adapters. Includes USB-C cables, Lightning cables, HDMI cables, and power adapters.",
  tags: ["electronics", "cables", "chargers"],
  location: "Top Shelf",
};

/**
 * Holiday decorations box
 */
export const HOLIDAY_DECORATIONS: BoxFixture = {
  name: "Holiday Decorations",
  description: "Christmas lights, ornaments, and seasonal decorations",
  tags: ["holiday", "seasonal", "christmas"],
  location: "Middle Shelf",
};

/**
 * Books box
 */
export const BOOKS_BOX: BoxFixture = {
  name: "Books",
  description: "Fiction novels and reference books",
  tags: ["books", "reading", "literature"],
  location: "Bottom Shelf",
};

/**
 * Kitchen supplies box
 */
export const KITCHEN_SUPPLIES: BoxFixture = {
  name: "Kitchen Supplies",
  description: "Extra utensils, cutting boards, and kitchen gadgets",
  tags: ["kitchen", "cookware", "utensils"],
  location: "Wooden Shelves",
};

/**
 * Tools box
 */
export const TOOLS_BOX: BoxFixture = {
  name: "Tools",
  description: "Hand tools: hammers, screwdrivers, wrenches, pliers, measuring tape",
  tags: ["tools", "hardware", "maintenance"],
  location: "Garage",
};

/**
 * Empty box (no description or tags)
 */
export const EMPTY_BOX: BoxFixture = {
  name: "Empty Box",
  description: null,
  tags: [],
};

/**
 * Box without location (unassigned)
 */
export const UNASSIGNED_BOX: BoxFixture = {
  name: "Unassigned Box",
  description: "Box not yet placed in a location",
  tags: ["temporary", "pending"],
};

/**
 * Box with long description for testing limits
 */
export const LONG_DESCRIPTION_BOX: BoxFixture = {
  name: "Archive Box",
  description: "A".repeat(500), // Near 10000 character limit
  tags: ["archive", "documents"],
};

/**
 * Box with many tags
 */
export const MANY_TAGS_BOX: BoxFixture = {
  name: "Miscellaneous",
  description: "Various items",
  tags: ["misc", "various", "random", "unsorted", "mixed", "general", "odds-and-ends", "assorted"],
};

/**
 * Box for testing search functionality
 */
export const SEARCHABLE_BOX: BoxFixture = {
  name: "Computer Parts",
  description: "RAM modules, hard drives, SSDs, motherboards, graphics cards, and cooling fans",
  tags: ["computer", "hardware", "pc", "components"],
  location: "Left Section",
};

/**
 * Boxes for testing sorting and filtering
 */
export const FILTER_BOXES = [ELECTRONICS_BOX, HOLIDAY_DECORATIONS, BOOKS_BOX, KITCHEN_SUPPLIES, TOOLS_BOX] as const;

/**
 * Boxes for testing full-text search
 */
export const SEARCH_BOXES = [ELECTRONICS_BOX, SEARCHABLE_BOX, TOOLS_BOX] as const;

/**
 * All predefined boxes
 */
export const ALL_BOXES = [
  ELECTRONICS_BOX,
  HOLIDAY_DECORATIONS,
  BOOKS_BOX,
  KITCHEN_SUPPLIES,
  TOOLS_BOX,
  EMPTY_BOX,
  UNASSIGNED_BOX,
  LONG_DESCRIPTION_BOX,
  MANY_TAGS_BOX,
  SEARCHABLE_BOX,
] as const;
