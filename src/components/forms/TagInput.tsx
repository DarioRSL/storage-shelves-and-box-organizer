import React, { useRef, useState, useEffect, useCallback } from "react";
import { X, AlertCircle } from "lucide-react";

export interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  onBlur?: () => void;
  error?: string;
  disabled?: boolean;
  suggestedTags?: string[];
  maxTags?: number;
}

const TAG_MAX_LENGTH = 50;
// Allow alphanumeric (including Unicode letters), spaces, hyphens, and underscores
const TAG_PATTERN = /^[\p{L}\p{N}\s\-_]+$/u;

/**
 * TagInput - Combobox for managing box tags.
 * Supports suggestions filtering, tag chip management, and keyboard navigation.
 */
export function TagInput({
  value,
  onChange,
  onBlur,
  error,
  disabled = false,
  suggestedTags = [],
  maxTags = 10,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter suggestions based on input
  const filteredSuggestions = suggestedTags.filter(
    (tag) => !value.includes(tag) && tag.toLowerCase().includes(inputValue.toLowerCase())
  );

  const isAtMaxTags = value.length >= maxTags;
  const canAddMore = !isAtMaxTags && value.length < maxTags;

  // Handle tag addition
  const addTag = useCallback(
    (tag: string) => {
      const trimmedTag = tag.trim();

      // Validation
      if (!trimmedTag) return;
      if (trimmedTag.length > TAG_MAX_LENGTH) return;
      if (!TAG_PATTERN.test(trimmedTag)) return;
      if (value.some((t) => t.toLowerCase() === trimmedTag.toLowerCase())) return;
      if (!canAddMore) return;

      onChange([...value, trimmedTag]);
      setInputValue("");
      setSelectedIndex(-1);
      inputRef.current?.focus();
    },
    [value, onChange, canAddMore]
  );

  // Handle tag removal
  const removeTag = useCallback(
    (index: number) => {
      onChange(value.filter((_, i) => i !== index));
    },
    [value, onChange]
  );

  // Handle input changes
  const handleInputChange = (newValue: string) => {
    setInputValue(newValue);
    setIsOpen(true);
    setSelectedIndex(-1);
  };

  // Handle key events
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && filteredSuggestions[selectedIndex]) {
          addTag(filteredSuggestions[selectedIndex]);
        } else if (inputValue.trim()) {
          addTag(inputValue);
        }
        break;

      case "Backspace":
        if (!inputValue && value.length > 0) {
          e.preventDefault();
          removeTag(value.length - 1);
        }
        break;

      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => (prev < filteredSuggestions.length - 1 ? prev + 1 : prev));
        break;

      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;

      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        setSelectedIndex(-1);
        break;

      case "a":
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          inputRef.current?.select();
        }
        break;
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label htmlFor="box-tags" className="block text-sm font-medium text-gray-900 dark:text-gray-100">
          Tags
        </label>
        {value.length > 0 && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {value.length}/{maxTags}
          </span>
        )}
      </div>

      <div ref={containerRef} className="relative">
        {/* Tag display */}
        <div
          className={`w-full min-h-10 px-3 py-2 border rounded-md bg-white dark:bg-gray-900 flex flex-wrap gap-2 items-start content-start ${
            error ? "border-red-500 dark:border-red-500" : "border-gray-300 dark:border-gray-600"
          } focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent`}
          onClick={() => inputRef.current?.focus()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              inputRef.current?.focus();
            }
          }}
          role="button"
          tabIndex={0}
        >
          {/* Rendered tags */}
          {value.map((tag, index) => (
            <div
              key={index}
              className="inline-flex items-center gap-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100 px-2 py-1 rounded text-sm"
            >
              <span>{tag}</span>
              <button
                type="button"
                onClick={() => removeTag(index)}
                disabled={disabled}
                className="text-blue-600 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-100 disabled:opacity-50"
                aria-label={`Remove tag: ${tag}`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}

          {/* Input field */}
          {!isAtMaxTags && (
            <input
              ref={inputRef}
              id="box-tags"
              type="text"
              value={inputValue}
              onChange={(e) => handleInputChange(e.target.value)}
              onBlur={onBlur}
              onKeyDown={handleKeyDown}
              disabled={disabled}
              placeholder={value.length === 0 ? "Add tags..." : ""}
              maxLength={TAG_MAX_LENGTH}
              className="flex-1 min-w-[100px] outline-none bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 disabled:opacity-50"
              aria-invalid={!!error}
              aria-describedby={error ? "box-tags-error" : undefined}
              aria-expanded={isOpen}
              aria-controls="tag-suggestions-list"
              role="combobox"
              autoComplete="off"
            />
          )}
        </div>

        {/* Suggestions dropdown */}
        {isOpen && filteredSuggestions.length > 0 && (
          <ul
            id="tag-suggestions-list"
            role="listbox"
            className="absolute top-full left-0 right-0 mt-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-md shadow-lg z-10 max-h-48 overflow-y-auto"
          >
            {filteredSuggestions.map((tag, index) => (
              <li
                key={tag}
                role="option"
                aria-selected={index === selectedIndex}
                className={`px-3 py-2 cursor-pointer text-sm ${
                  index === selectedIndex
                    ? "bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100"
                    : "text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleSelectSuggestion(tag);
                  }
                }}
                onClick={() => addTag(tag)}
              >
                {tag}
              </li>
            ))}
          </ul>
        )}

        {/* Error icon in input */}
        {error && <AlertCircle className="absolute right-3 top-2.5 h-5 w-5 text-red-500 pointer-events-none" />}
      </div>

      {/* Error message */}
      {error && (
        <p id="box-tags-error" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {/* Helper text */}
      {!error && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Press Enter to add a tag, or select from suggestions.
        </p>
      )}
    </div>
  );
}
