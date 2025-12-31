import React, { useState, useRef } from "react";
import { ChevronDown, AlertCircle } from "lucide-react";
import { Modal } from "@/components/shared/Modal";
import { LocationTree } from "./LocationTree";

export interface LocationSelectorProps {
  value: string | null;
  onChange: (locationId: string | null) => void;
  onBlur?: () => void;
  error?: string;
  disabled?: boolean;
  workspaceId: string;
}

/**
 * LocationSelector - Selector for hierarchical location structure.
 * Displays tree view of locations with lazy loading support.
 * Used for assigning boxes to storage locations.
 */
export function LocationSelector({
  value,
  onChange,
  onBlur,
  error,
  disabled = false,
  workspaceId,
}: LocationSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLocationName, setSelectedLocationName] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const handleLocationSelect = (locationId: string) => {
    onChange(locationId);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedLocationName(null);
    onChange(null);
  };

  return (
    <div className="space-y-2">
      <label htmlFor="box-location" className="block text-sm font-medium text-gray-900 dark:text-gray-100">
        Location
      </label>

      <div className="relative">
        <button
          ref={triggerRef}
          id="box-location"
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          onBlur={onBlur}
          disabled={disabled}
          className={`w-full px-3 py-2 border rounded-md text-sm text-left transition-colors flex items-center justify-between ${
            error
              ? "border-red-500 bg-red-50 dark:bg-red-950"
              : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
          } text-gray-900 dark:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
          aria-invalid={!!error}
          aria-describedby={error ? "box-location-error" : undefined}
          aria-expanded={isOpen}
          aria-haspopup="dialog"
        >
          <span
            className={selectedLocationName ? "text-gray-900 dark:text-gray-100" : "text-gray-500 dark:text-gray-400"}
          >
            {selectedLocationName ? (
              <span className="flex items-center gap-2">
                {selectedLocationName}
                {value && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                  >
                    Clear
                  </button>
                )}
              </span>
            ) : (
              "Select a location"
            )}
          </span>
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>

        {error && <AlertCircle className="absolute right-3 top-2.5 h-5 w-5 text-red-500 pointer-events-none" />}
      </div>

      {/* Location picker modal */}
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Select Location">
        <LocationTree workspaceId={workspaceId} selectedId={value} onSelect={handleLocationSelect} />
      </Modal>

      {error && (
        <p id="box-location-error" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
