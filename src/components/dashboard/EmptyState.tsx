import { Button } from "@/components/ui/button";
import { Package, Search, ChevronDown } from "lucide-react";
import { useState, useEffect, useRef } from "react";

interface EmptyStateProps {
  type: "empty-workspace" | "no-results" | "no-locations";
  onAddLocation?: () => void;
  onAddBox?: () => void;
  onScanQr?: () => void;
}

/**
 * Empty state component for different scenarios
 * - empty-workspace: No boxes in workspace
 * - no-results: No search results
 * - no-locations: No locations created
 */
export default function EmptyState({ type, onAddLocation, onAddBox }: EmptyStateProps) {
  const [showBoxOptions, setShowBoxOptions] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowBoxOptions(false);
      }
    };

    if (showBoxOptions) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showBoxOptions]);

  if (type === "no-results") {
    return (
      <div
        className="flex h-full flex-col items-center justify-center gap-4 px-6 py-12"
        role="status"
        aria-live="polite"
      >
        <Search className="h-12 w-12 text-muted-foreground" aria-hidden="true" />
        <div className="text-center">
          <h3 className="text-lg font-semibold text-foreground">Brak wyników</h3>
          <p className="mt-1 text-sm text-muted-foreground">Nie znaleziono pudełek dla tego wyszukiwania</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 px-6 py-12" role="status" aria-live="polite">
      <Package className="h-12 w-12 text-muted-foreground" aria-hidden="true" />
      <div className="text-center max-w-sm">
        <h3 className="text-lg font-semibold text-foreground">Brak pudełek</h3>
        <p className="mt-2 text-sm text-muted-foreground">Zacznij od utworzenia lokalizacji lub dodania pudełka</p>
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        {onAddLocation && (
          <Button onClick={onAddLocation} variant="outline" size="sm" aria-label="Dodaj nową lokalizację">
            Nowa lokalizacja
          </Button>
        )}
        {onAddBox && (
          <div className="relative" ref={menuRef}>
            <Button
              onClick={() => setShowBoxOptions(!showBoxOptions)}
              size="sm"
              aria-label="Opcje dodawania pudełka"
              className="flex items-center gap-2"
            >
              Dodaj pudełko
              <ChevronDown className="h-4 w-4" />
            </Button>

            {showBoxOptions && (
              <div
                className="absolute top-full mt-2 right-0 bg-card border border-border rounded-md shadow-lg z-10 min-w-max"
                role="menu"
              >
                <button
                  onClick={() => {
                    onAddBox();
                    setShowBoxOptions(false);
                  }}
                  className="block w-full text-left px-4 py-2 text-sm text-foreground hover:bg-muted first:rounded-t-md"
                  role="menuitem"
                >
                  Szybkie dodanie (Modal)
                </button>
                <a
                  href="/app/boxes/new"
                  className="block px-4 py-2 text-sm text-foreground hover:bg-muted last:rounded-b-md"
                  role="menuitem"
                >
                  Pełny formularz
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
