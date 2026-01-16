/**
 * Unit Tests for location.service.ts Pure Functions
 *
 * Tests ONLY the pure utility functions in the location service.
 * Impure service functions are deferred to integration tests.
 *
 * Business Rules:
 * - normalizeLocationName: Transliterates Polish characters, converts to lowercase, replaces special chars with underscores
 * - slugify: Alias for normalizeLocationName
 * - getParentPath: Extracts parent path from ltree path string
 * - regeneratePath: Rebuilds ltree path with new name while preserving parent hierarchy
 * - buildLocationPath: Constructs ltree path based on parent path and normalized name
 * - getPathDepth: Counts segments in ltree path to calculate depth
 *
 * ltree Format:
 * - Hierarchical labels separated by dots (e.g., "root.garage.shelf_a")
 * - Labels must match [A-Za-z0-9_] and be 1-256 characters
 * - Root level is "root", first location is "root.{name}", max depth is 5 levels
 *
 * Coverage Target: 100% for pure functions
 * Test Count: 26 tests
 */

import { describe, it, expect, vi } from "vitest";
import {
  normalizeLocationName,
  slugify,
  getParentPath,
  regeneratePath,
  buildLocationPath,
  getPathDepth,
} from "@/lib/services/location.service";
import * as transliterate from "@/lib/utils/transliterate";

// Mock the transliterate module to avoid dependency
vi.mock("@/lib/utils/transliterate", async (importOriginal) => {
  const actual = (await importOriginal()) as typeof transliterate;
  return {
    ...actual,
    sanitizeForLtree: actual.sanitizeForLtree,
    transliteratePolish: actual.transliteratePolish,
  };
});

describe("location.service.ts - Pure Functions", () => {
  describe("normalizeLocationName", () => {
    it("TC-LOCATION-001: should transliterate Polish lowercase characters", () => {
      const input = "ąćęłńóśźż";
      const result = normalizeLocationName(input);

      expect(result).toBe("acelnoszz");
    });

    it("TC-LOCATION-002: should transliterate Polish uppercase characters", () => {
      const input = "ĄĆĘŁŃÓŚŹŻ";
      const result = normalizeLocationName(input);

      expect(result).toBe("acelnoszz");
    });

    it("TC-LOCATION-003: should convert mixed case to lowercase", () => {
      const input = "Shelf A";
      const result = normalizeLocationName(input);

      expect(result).toBe("shelf_a");
    });

    it("TC-LOCATION-004: should replace spaces with underscores", () => {
      const input = "Top Left Corner";
      const result = normalizeLocationName(input);

      expect(result).toBe("top_left_corner");
    });

    it("TC-LOCATION-005: should replace special characters with underscores", () => {
      const input = "Box #123!";
      const result = normalizeLocationName(input);

      expect(result).toBe("box_123");
    });

    it("TC-LOCATION-006: should replace hyphens with underscores", () => {
      const input = "Top-Left-Corner";
      const result = normalizeLocationName(input);

      expect(result).toBe("top_left_corner");
    });

    it("TC-LOCATION-007: should collapse multiple consecutive underscores to single", () => {
      const input = "Box   #@#   123";
      const result = normalizeLocationName(input);

      expect(result).toBe("box_123");
    });

    it("TC-LOCATION-008: should trim underscores from start and end", () => {
      const input = "  Shelf  ";
      const result = normalizeLocationName(input);

      expect(result).toBe("shelf");
    });

    it("TC-LOCATION-009: should handle empty string", () => {
      const input = "";
      const result = normalizeLocationName(input);

      expect(result).toBe("");
    });

    it("TC-LOCATION-010: should handle string with only special characters", () => {
      const input = "!@#$%^&*()";
      const result = normalizeLocationName(input);

      expect(result).toBe("");
    });

    it("TC-LOCATION-011: should handle Polish example 'Garaż Metalowy'", () => {
      const input = "Garaż Metalowy";
      const result = normalizeLocationName(input);

      expect(result).toBe("garaz_metalowy");
    });

    it("TC-LOCATION-012: should handle Polish example 'Półka #1'", () => {
      const input = "Półka #1";
      const result = normalizeLocationName(input);

      expect(result).toBe("polka_1");
    });

    it("TC-LOCATION-013: should preserve alphanumeric and underscores", () => {
      const input = "Box_123_abc";
      const result = normalizeLocationName(input);

      expect(result).toBe("box_123_abc");
    });
  });

  describe("slugify", () => {
    it("TC-LOCATION-014: should be an alias for normalizeLocationName", () => {
      const input = "Test Location";
      const slugResult = slugify(input);
      const normalizeResult = normalizeLocationName(input);

      expect(slugResult).toBe(normalizeResult);
      expect(slugResult).toBe("test_location");
    });

    it("TC-LOCATION-015: should handle Polish characters the same way", () => {
      const input = "Półka Górna";
      const result = slugify(input);

      expect(result).toBe("polka_gorna");
    });

    it("TC-LOCATION-016: should handle special characters the same way", () => {
      const input = "Top-Left Corner #5";
      const result = slugify(input);

      expect(result).toBe("top_left_corner_5");
    });
  });

  describe("getParentPath", () => {
    it("TC-LOCATION-017: should extract parent from multi-level path", () => {
      const path = "root.garage.shelf_a";
      const result = getParentPath(path);

      expect(result).toBe("root.garage");
    });

    it("TC-LOCATION-018: should extract parent from two-level path", () => {
      const path = "root.garage";
      const result = getParentPath(path);

      expect(result).toBe("root");
    });

    it("TC-LOCATION-019: should return empty string for root path", () => {
      const path = "root";
      const result = getParentPath(path);

      expect(result).toBe("");
    });

    it("TC-LOCATION-020: should handle deep nesting (5 levels)", () => {
      const path = "root.garage.rack.shelf.section.box_area";
      const result = getParentPath(path);

      expect(result).toBe("root.garage.rack.shelf.section");
    });

    it("TC-LOCATION-021: should handle single segment without dots", () => {
      const path = "single";
      const result = getParentPath(path);

      expect(result).toBe("");
    });
  });

  describe("regeneratePath", () => {
    it("TC-LOCATION-022: should regenerate path with new name at same level", () => {
      const oldPath = "root.garage.shelf_a";
      const newName = "Top Shelf";
      const result = regeneratePath(oldPath, newName);

      expect(result).toBe("root.garage.top_shelf");
    });

    it("TC-LOCATION-023: should regenerate root-level path", () => {
      const oldPath = "root.garage";
      const newName = "Warehouse";
      const result = regeneratePath(oldPath, newName);

      expect(result).toBe("root.warehouse");
    });

    it("TC-LOCATION-024: should handle root path without parent", () => {
      const oldPath = "root";
      const newName = "New Root";
      const result = regeneratePath(oldPath, newName);

      expect(result).toBe("new_root");
    });

    it("TC-LOCATION-025: should normalize new name during regeneration", () => {
      const oldPath = "root.garage.shelf_a";
      const newName = "Top Left Corner!";
      const result = regeneratePath(oldPath, newName);

      expect(result).toBe("root.garage.top_left_corner");
    });

    it("TC-LOCATION-026: should handle Polish characters in new name", () => {
      const oldPath = "root.garage.polka";
      const newName = "Półka Górna";
      const result = regeneratePath(oldPath, newName);

      expect(result).toBe("root.garage.polka_gorna");
    });

    it("TC-LOCATION-027: should handle deep nesting regeneration", () => {
      const oldPath = "root.a.b.c.d";
      const newName = "New Name";
      const result = regeneratePath(oldPath, newName);

      expect(result).toBe("root.a.b.c.new_name");
    });
  });

  describe("buildLocationPath", () => {
    it("TC-LOCATION-028: should build root-level path when parent is null", () => {
      const parentPath = null;
      const normalizedName = "garage";
      const result = buildLocationPath(parentPath, normalizedName);

      expect(result).toBe("root.garage");
    });

    it("TC-LOCATION-029: should build child path with parent path", () => {
      const parentPath = "root.garage";
      const normalizedName = "shelf_a";
      const result = buildLocationPath(parentPath, normalizedName);

      expect(result).toBe("root.garage.shelf_a");
    });

    it("TC-LOCATION-030: should build deep nested path", () => {
      const parentPath = "root.garage.rack.shelf";
      const normalizedName = "section_1";
      const result = buildLocationPath(parentPath, normalizedName);

      expect(result).toBe("root.garage.rack.shelf.section_1");
    });

    it("TC-LOCATION-031: should use root constant for null parent", () => {
      const parentPath = null;
      const normalizedName = "warehouse";
      const result = buildLocationPath(parentPath, normalizedName);

      expect(result).toBe("root.warehouse");
      expect(result.startsWith("root.")).toBe(true);
    });

    it("TC-LOCATION-032: should handle already normalized names", () => {
      const parentPath = "root.garage";
      const normalizedName = "top_shelf";
      const result = buildLocationPath(parentPath, normalizedName);

      expect(result).toBe("root.garage.top_shelf");
    });
  });

  describe("getPathDepth", () => {
    it("TC-LOCATION-033: should return 1 for root path", () => {
      const path = "root";
      const result = getPathDepth(path);

      expect(result).toBe(1);
    });

    it("TC-LOCATION-034: should return 2 for root-level location", () => {
      const path = "root.garage";
      const result = getPathDepth(path);

      expect(result).toBe(2);
    });

    it("TC-LOCATION-035: should return 3 for second-level location", () => {
      const path = "root.garage.shelf_a";
      const result = getPathDepth(path);

      expect(result).toBe(3);
    });

    it("TC-LOCATION-036: should return 4 for third-level location", () => {
      const path = "root.garage.shelf_a.section_1";
      const result = getPathDepth(path);

      expect(result).toBe(4);
    });

    it("TC-LOCATION-037: should return 5 for fourth-level location", () => {
      const path = "root.garage.rack.shelf.section";
      const result = getPathDepth(path);

      expect(result).toBe(5);
    });

    it("TC-LOCATION-038: should return 6 for max depth location (5 levels)", () => {
      const path = "root.garage.rack.shelf.section.box_area";
      const result = getPathDepth(path);

      expect(result).toBe(6);
    });

    it("TC-LOCATION-039: should handle single segment without dots", () => {
      const path = "single";
      const result = getPathDepth(path);

      expect(result).toBe(1);
    });

    it("TC-LOCATION-040: should count all segments including root", () => {
      const path = "root.a.b.c.d.e";
      const result = getPathDepth(path);

      expect(result).toBe(6);
    });
  });

  describe("Integration scenarios", () => {
    it("should normalize and build path for new root location", () => {
      const locationName = "Garaż Metalowy";
      const normalized = normalizeLocationName(locationName);
      const path = buildLocationPath(null, normalized);

      expect(normalized).toBe("garaz_metalowy");
      expect(path).toBe("root.garaz_metalowy");
      expect(getPathDepth(path)).toBe(2);
    });

    it("should normalize and build path for nested location", () => {
      const parentPath = "root.garage";
      const locationName = "Półka Górna #5";
      const normalized = normalizeLocationName(locationName);
      const path = buildLocationPath(parentPath, normalized);

      expect(normalized).toBe("polka_gorna_5");
      expect(path).toBe("root.garage.polka_gorna_5");
      expect(getPathDepth(path)).toBe(3);
    });

    it("should extract parent and regenerate path correctly", () => {
      const currentPath = "root.garage.shelf_a";
      const parent = getParentPath(currentPath);
      const newName = "Top Shelf";
      const newPath = regeneratePath(currentPath, newName);

      expect(parent).toBe("root.garage");
      expect(newPath).toBe("root.garage.top_shelf");
      expect(getPathDepth(newPath)).toBe(3);
    });

    it("should handle complete rename flow at root level", () => {
      const currentPath = "root.garage";
      const newName = "Warehouse";
      const newPath = regeneratePath(currentPath, newName);

      expect(newPath).toBe("root.warehouse");
      expect(getPathDepth(newPath)).toBe(2);
    });

    it("should validate depth for max nesting (5 levels)", () => {
      const parentPath = "root.a.b.c.d";
      const normalized = normalizeLocationName("Box Area");
      const path = buildLocationPath(parentPath, normalized);
      const depth = getPathDepth(path);

      expect(path).toBe("root.a.b.c.d.box_area");
      expect(depth).toBe(6); // root + 5 levels
    });

    it("should handle edge case with special characters throughout flow", () => {
      const locationName = "!@# Box #123 $%^";
      const normalized = normalizeLocationName(locationName);
      const path = buildLocationPath("root.garage", normalized);

      expect(normalized).toBe("box_123");
      expect(path).toBe("root.garage.box_123");
    });
  });

  describe("Edge cases and validation", () => {
    it("should handle very long location names", () => {
      const longName = "A".repeat(300);
      const normalized = normalizeLocationName(longName);

      expect(normalized.length).toBeLessThanOrEqual(300);
      expect(normalized).toBe("a".repeat(300));
    });

    it("should handle location names with only Polish characters", () => {
      const polishName = "ążśćłńę";
      const normalized = normalizeLocationName(polishName);

      expect(normalized).toBe("azsclne");
    });

    it("should handle paths with underscores in names", () => {
      const path = "root.garage_main.shelf_a_top";
      const parent = getParentPath(path);
      const depth = getPathDepth(path);

      expect(parent).toBe("root.garage_main");
      expect(depth).toBe(3);
    });

    it("should handle regeneratePath with same name (no-op)", () => {
      const oldPath = "root.garage.shelf_a";
      const newName = "Shelf A";
      const newPath = regeneratePath(oldPath, newName);

      expect(newPath).toBe("root.garage.shelf_a");
    });

    it("should handle buildLocationPath with empty normalized name", () => {
      const parentPath = "root.garage";
      const normalizedName = "";
      const result = buildLocationPath(parentPath, normalizedName);

      expect(result).toBe("root.garage.");
    });
  });
});
