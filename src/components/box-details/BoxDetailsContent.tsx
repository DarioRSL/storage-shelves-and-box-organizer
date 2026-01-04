import { useState, useEffect, useCallback } from "react";
import type { BoxDto } from "@/types";
import { apiFetch, ApiError, getUserFriendlyErrorMessage, logError, shouldRedirectToLogin } from "@/lib/api-client";
import { BoxHeader } from "./BoxHeader";
import { LocationBreadcrumbs } from "./LocationBreadcrumbs";
import { DescriptionSection } from "./DescriptionSection";
import { TagsDisplay } from "./TagsDisplay";
import { QrCodeDisplay } from "./QrCodeDisplay";
import { ActionButtonsSection } from "./ActionButtonsSection";
import { DeleteConfirmationDialog } from "./DeleteConfirmationDialog";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { ErrorAlert } from "@/components/shared/ErrorAlert";

interface BoxDetailsContentProps {
  boxId: string;
}

export default function BoxDetailsContent({ boxId }: BoxDetailsContentProps) {
  const [box, setBox] = useState<BoxDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleteConfirmDialogOpen, setIsDeleteConfirmDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Validate UUID format
  const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(boxId);

  const fetchBox = useCallback(async () => {
    if (!isValidUUID) {
      setError("Nieprawidłowy identyfikator pudełka");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await apiFetch<BoxDto>(`/api/boxes/${boxId}`);
      setBox(data);
    } catch (err) {
      logError("BoxDetailsContent.fetchBox", err);

      if (shouldRedirectToLogin(err)) {
        window.location.href = "/auth";
        return;
      }

      if (err instanceof ApiError) {
        if (err.status === 404) {
          setError("Pudełko nie zostało znalezione lub zostało usunięte");
        } else if (err.status === 403) {
          setError("Nie masz dostępu do tego pudełka");
        } else {
          setError(getUserFriendlyErrorMessage(err));
        }
      } else {
        setError("Wystąpił nieoczekiwany błąd podczas ładowania danych");
      }
    } finally {
      setIsLoading(false);
    }
  }, [boxId, isValidUUID]);

  useEffect(() => {
    fetchBox();
  }, [fetchBox]);

  const handleRetry = () => {
    fetchBox();
  };

  const handleDeleteClick = () => {
    setIsDeleteConfirmDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);

    try {
      await apiFetch<{ message: string }>(`/api/boxes/${boxId}`, {
        method: "DELETE",
      });

      // Redirect to dashboard after successful delete
      window.location.href = "/app";
    } catch (err) {
      logError("BoxDetailsContent.handleConfirmDelete", err);

      if (shouldRedirectToLogin(err)) {
        window.location.href = "/auth";
        return;
      }

      if (err instanceof ApiError) {
        setError(`Nie udało się usunąć pudełka: ${getUserFriendlyErrorMessage(err)}`);
      } else {
        setError("Wystąpił nieoczekiwany błąd podczas usuwania pudełka");
      }
    } finally {
      setIsDeleting(false);
      setIsDeleteConfirmDialogOpen(false);
    }
  };

  const handleCancelDelete = () => {
    setIsDeleteConfirmDialogOpen(false);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <LoadingSpinner message="Ładowanie danych pudełka..." size="lg" />
      </div>
    );
  }

  // Error state
  if (error) {
    return <ErrorAlert error={error} onRetry={handleRetry} />;
  }

  // No data state (should not happen if error handling is correct)
  if (!box) {
    return <ErrorAlert error="Nie udało się załadować danych pudełka" onRetry={handleRetry} />;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Back navigation */}
      <nav aria-label="Powrót" className="mb-4">
        <a
          href="/app"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 mr-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Wróć do listy
        </a>
      </nav>

      {/* Box Header */}
      <BoxHeader name={box.name} createdAt={box.created_at} updatedAt={box.updated_at} />

      {/* Location Breadcrumbs */}
      <LocationBreadcrumbs location={box.location} />

      {/* Description Section */}
      <DescriptionSection description={box.description} />

      {/* Tags Display */}
      <TagsDisplay tags={box.tags} />

      {/* QR Code Display */}
      <QrCodeDisplay qrCode={box.qr_code} />

      {/* Action Buttons */}
      <ActionButtonsSection boxId={box.id} onDeleteClick={handleDeleteClick} isDeleting={isDeleting} />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        isOpen={isDeleteConfirmDialogOpen}
        boxName={box.name}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        isLoading={isDeleting}
      />
    </div>
  );
}
