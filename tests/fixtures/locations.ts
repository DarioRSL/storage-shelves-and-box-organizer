/**
 * Location Fixtures
 *
 * Predefined location hierarchies for testing ltree functionality.
 * Supports up to 5 levels deep as per database schema.
 */

export interface LocationFixture {
  name: string;
  path: string;
  description?: string;
  level: number; // 1-5
}

/**
 * Root locations (Level 1)
 */
export const ROOT_GARAGE: LocationFixture = {
  name: 'Garage',
  path: 'root.garage',
  description: 'Main garage storage area',
  level: 1,
};

export const ROOT_BASEMENT: LocationFixture = {
  name: 'Basement',
  path: 'root.basement',
  description: 'Basement storage',
  level: 1,
};

export const ROOT_ATTIC: LocationFixture = {
  name: 'Attic',
  path: 'root.attic',
  description: 'Attic storage space',
  level: 1,
};

/**
 * Level 2 locations (children of root)
 */
export const METAL_RACK: LocationFixture = {
  name: 'Metal Rack',
  path: 'root.garage.metalrack',
  description: 'Large metal storage rack in garage',
  level: 2,
};

export const WOODEN_SHELVES: LocationFixture = {
  name: 'Wooden Shelves',
  path: 'root.basement.woodenshelves',
  description: 'Wooden shelf unit in basement',
  level: 2,
};

/**
 * Level 3 locations (grandchildren)
 */
export const TOP_SHELF: LocationFixture = {
  name: 'Top Shelf',
  path: 'root.garage.metalrack.topshelf',
  description: 'Top shelf of metal rack',
  level: 3,
};

export const MIDDLE_SHELF: LocationFixture = {
  name: 'Middle Shelf',
  path: 'root.garage.metalrack.middleshelf',
  description: 'Middle shelf of metal rack',
  level: 3,
};

export const BOTTOM_SHELF: LocationFixture = {
  name: 'Bottom Shelf',
  path: 'root.garage.metalrack.bottomshelf',
  description: 'Bottom shelf of metal rack',
  level: 3,
};

/**
 * Level 4 locations
 */
export const LEFT_SECTION: LocationFixture = {
  name: 'Left Section',
  path: 'root.garage.metalrack.topshelf.leftsection',
  description: 'Left section of top shelf',
  level: 4,
};

export const RIGHT_SECTION: LocationFixture = {
  name: 'Right Section',
  path: 'root.garage.metalrack.topshelf.rightsection',
  description: 'Right section of top shelf',
  level: 4,
};

/**
 * Level 5 locations (maximum depth)
 */
export const BOX_AREA_A: LocationFixture = {
  name: 'Box Area A',
  path: 'root.garage.metalrack.topshelf.leftsection.boxareaa',
  description: 'Box storage area A in left section',
  level: 5,
};

/**
 * Hierarchical structure for testing
 * Garage → Metal Rack → Top Shelf → Left Section → Box Area A
 */
export const HIERARCHICAL_LOCATIONS = [
  ROOT_GARAGE,
  METAL_RACK,
  TOP_SHELF,
  LEFT_SECTION,
  BOX_AREA_A,
] as const;

/**
 * All root-level locations
 */
export const ROOT_LOCATIONS = [ROOT_GARAGE, ROOT_BASEMENT, ROOT_ATTIC] as const;

/**
 * Locations for testing search and filtering
 */
export const SEARCH_LOCATIONS = [
  ROOT_GARAGE,
  METAL_RACK,
  TOP_SHELF,
  MIDDLE_SHELF,
  BOTTOM_SHELF,
  LEFT_SECTION,
  RIGHT_SECTION,
] as const;

/**
 * All predefined locations
 */
export const ALL_LOCATIONS = [
  ROOT_GARAGE,
  ROOT_BASEMENT,
  ROOT_ATTIC,
  METAL_RACK,
  WOODEN_SHELVES,
  TOP_SHELF,
  MIDDLE_SHELF,
  BOTTOM_SHELF,
  LEFT_SECTION,
  RIGHT_SECTION,
  BOX_AREA_A,
] as const;
