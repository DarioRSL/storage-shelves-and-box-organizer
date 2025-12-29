import { Button } from "@/components/ui/button";
import { Package, Search } from "lucide-react";

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
  if (type === "no-results") {
    return (
      <div
        className="flex h-full flex-col items-center justify-center gap-4 px-6 py-12"
        role="status"
        aria-live="polite"
      >
        <Search className="h-12 w-12 text-gray-300" aria-hidden="true" />
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900">Brak wyników</h3>
          <p className="mt-1 text-sm text-gray-500">Nie znaleziono pudełek dla tego wyszukiwania</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 px-6 py-12" role="status" aria-live="polite">
      <Package className="h-12 w-12 text-gray-300" aria-hidden="true" />
      <div className="text-center max-w-sm">
        <h3 className="text-lg font-semibold text-gray-900">Brak pudełek</h3>
        <p className="mt-2 text-sm text-gray-500">Zacznij od utworzenia lokalizacji lub dodania pudełka</p>
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        {onAddLocation && (
          <Button onClick={onAddLocation} variant="outline" size="sm" aria-label="Dodaj nową lokalizację">
            Nowa lokalizacja
          </Button>
        )}
        {onAddBox && (
          <Button onClick={onAddBox} size="sm" aria-label="Dodaj nowe pudełko">
            Dodaj pudełko
          </Button>
        )}
      </div>
    </div>
  );
}
