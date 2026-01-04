import React from "react";
import { useDashboard } from "@/contexts/DashboardContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X, Loader } from "lucide-react";

/**
 * Search input component with debouncing and validation
 * - Minimum 3 characters for search
 * - Max 200 characters
 * - Shows loading state during search
 */
export default function SearchInput() {
  const { state, actions } = useDashboard();
  const [inputValue, setInputValue] = React.useState(state.searchQuery);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;

    // Trim whitespace
    value = value.trim();

    // Max 200 characters
    if (value.length > 200) {
      value = value.slice(0, 200);
    }

    setInputValue(value);
    actions.setSearchQuery(value);
  };

  const handleClear = () => {
    setInputValue("");
    actions.clearSearch();
  };

  const showHint = inputValue.length > 0 && inputValue.length < 3;
  const isSearchValid = inputValue.length >= 3;

  return (
    <div className="space-y-1">
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          <Search className="h-4 w-4" />
        </div>
        <Input
          type="search"
          placeholder="Szukaj pudełek..."
          value={inputValue}
          onChange={handleChange}
          className="pl-10 pr-10"
          aria-label="Szukaj pudełek"
          aria-describedby={showHint ? "search-hint" : undefined}
          maxLength={200}
        />
        {inputValue && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
            aria-label="Wyczyść wyszukiwanie"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
        {state.isLoadingBoxes && (
          <div className="absolute right-10 top-1/2 -translate-y-1/2">
            <Loader className="h-4 w-4 animate-spin text-gray-400" />
          </div>
        )}
      </div>

      {showHint && (
        <p id="search-hint" className="text-xs text-gray-500">
          Wpisz co najmniej 3 znaki do wyszukiwania
        </p>
      )}

      {isSearchValid && state.isSearchActive && (
        <p className="text-xs text-gray-600">
          Znaleziono: {state.boxes.length} {state.boxes.length === 1 ? "pudełko" : "pudełek"}
        </p>
      )}
    </div>
  );
}
