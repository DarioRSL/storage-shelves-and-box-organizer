import React, { useEffect } from "react";
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
          </DialogHeader>
        )}

        {/* Modal content */}
        <div className="mt-4">{children}</div>
      </DialogContent>
    </Dialog>
  );
};
