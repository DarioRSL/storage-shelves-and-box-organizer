import { useStore } from "@nanostores/react";
import { currentWorkspaceId } from "@/stores/dashboard";
import { useQRCodeGeneration } from "./hooks/useQRCodeGeneration";
import { InstructionsPanel } from "./InstructionsPanel";
import { QRGeneratorForm } from "./QRGeneratorForm";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { ErrorBanner } from "@/components/ErrorBanner";
import { Button } from "@/components/ui/button";

/**
 * Main container for the QR Code Generator view.
 * Manages state, API integration, and coordinates child components.
 * Workspace ID is read from localStorage-persisted nano store.
 */
export default function QRGeneratorView() {
  const workspaceId = useStore(currentWorkspaceId);

  const { isLoading, error, generateAndDownloadPDF, clearError } = useQRCodeGeneration(workspaceId || "");

  const handleBackToDashboard = () => {
    globalThis.location.href = "/app";
  };

  // No workspace selected - show message and redirect option
  if (!workspaceId) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-2xl px-4 py-8">
          <header className="mb-8">
            <Button variant="ghost" size="sm" onClick={handleBackToDashboard} className="mb-4">
              <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Powrót do panelu
            </Button>
            <h1 className="text-3xl font-bold">Generator kodów QR</h1>
          </header>

          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-6 dark:border-yellow-900 dark:bg-yellow-950/20">
            <div className="flex items-start gap-3">
              <svg
                className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-600 dark:text-yellow-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <h3 className="font-medium text-yellow-800 dark:text-yellow-200">Brak wybranej przestrzeni roboczej</h3>
                <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
                  Aby wygenerować kody QR, musisz najpierw wybrać przestrzeń roboczą w panelu głównym.
                </p>
                <Button variant="outline" size="sm" className="mt-4" onClick={handleBackToDashboard}>
                  Przejdź do panelu głównego
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-8">
        {/* Header */}
        <header className="mb-8">
          <Button variant="ghost" size="sm" onClick={handleBackToDashboard} className="mb-4">
            <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Powrót do panelu
          </Button>
          <h1 className="text-3xl font-bold">Generator kodów QR</h1>
          <p className="mt-2 text-muted-foreground">
            Wygeneruj arkusz z kodami QR gotowymi do wydruku i naklejenia na pudełka.
          </p>
        </header>

        <div className="space-y-6">
          {/* Error Alert */}
          {error && <ErrorBanner message={error} onDismiss={clearError} />}

          {/* Instructions */}
          <InstructionsPanel />

          {/* Generation Form */}
          <QRGeneratorForm onSubmit={generateAndDownloadPDF} isLoading={isLoading} />

          {/* Loading Overlay */}
          {isLoading && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
              role="dialog"
              aria-modal="true"
              aria-labelledby="loading-title"
            >
              <div className="rounded-lg bg-white p-8 shadow-xl dark:bg-gray-900">
                <LoadingSpinner
                  size="lg"
                  message="Generowanie kodów QR i tworzenie pliku PDF..."
                  ariaLive="assertive"
                />
                <p id="loading-title" className="mt-4 text-center text-sm text-muted-foreground">
                  To może potrwać kilka sekund...
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
