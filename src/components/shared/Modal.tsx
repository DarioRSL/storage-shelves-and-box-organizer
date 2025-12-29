import React, { useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
  isDismissible?: boolean;
  className?: string;
}

/**
 * Reusable modal/dialog wrapper component.
 * Handles overlay, close button, focus management, ESC key handling.
 * Integrates with shadcn/ui Dialog component for consistent styling and accessibility.
 *
 * Features:
 * - Click outside to close (optional)
 * - ESC key closes modal
 * - Proper focus management
 * - Accessible with role="dialog" and aria-modal="true"
 * - Size variants (sm, md, lg)
 */
export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
  isDismissible = true,
  className = "",
}) => {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Handle ESC key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isDismissible) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscKey);
    return () => document.removeEventListener("keydown", handleEscKey);
  }, [isOpen, isDismissible, onClose]);

  // Size variants for Dialog content
  const sizeClasses = {
    sm: "sm:max-w-sm",
    md: "sm:max-w-md",
    lg: "sm:max-w-lg",
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={`${sizeClasses[size]} ${className}`}
        aria-modal="true"
        onEscapeKeyDown={isDismissible ? onClose : undefined}
      >
        {title && (
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {isDismissible && (
              <button
                ref={closeButtonRef}
                onClick={onClose}
                className="absolute right-4 top-4 p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                aria-label="Close modal"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </DialogHeader>
        )}

        {/* Modal content */}
        <div className="mt-4">{children}</div>
      </DialogContent>
    </Dialog>
  );
};
