import { useState, useCallback } from "react";
import { apiFetch, ApiError, getUserFriendlyErrorMessage, shouldRedirectToLogin } from "@/lib/api-client";
import { usePDFGeneration } from "./usePDFGeneration";
import type { BatchGenerateQrCodesResponse, QrCodeGeneratedItem, LabelFormat } from "@/types";
import { log } from "@/lib/services/logger";

interface UseQRCodeGenerationReturn {
  isLoading: boolean;
  error: string | null;
  generatedCodes: QrCodeGeneratedItem[];
  generateAndDownloadPDF: (quantity: number, format?: LabelFormat) => Promise<void>;
  clearError: () => void;
}

/**
 * Hook for generating QR codes via API and downloading as PDF.
 * Handles API call, error handling, and PDF generation coordination.
 */
export function useQRCodeGeneration(workspaceId: string): UseQRCodeGenerationReturn {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedCodes, setGeneratedCodes] = useState<QrCodeGeneratedItem[]>([]);

  const { generatePDF } = usePDFGeneration();

  const generateAndDownloadPDF = useCallback(
    async (quantity: number, format: LabelFormat = "a4-grid") => {
      // Validate workspace ID before request
      if (!workspaceId) {
        setError("Brak aktywnej przestrzeni roboczej. Wybierz przestrzeń w ustawieniach.");
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // 1. Call API to generate QR codes
        const response = await apiFetch<BatchGenerateQrCodesResponse>("/api/qr-codes/batch", {
          method: "POST",
          body: JSON.stringify({
            workspace_id: workspaceId,
            quantity,
          }),
        });

        // Validate response structure
        if (!response.data || !Array.isArray(response.data) || response.data.length === 0) {
          throw new Error("Nie udało się wygenerować kodów QR. Spróbuj ponownie.");
        }

        // Store generated codes
        const codes = response.data as QrCodeGeneratedItem[];
        setGeneratedCodes(codes);

        // 2. Generate PDF with the codes in selected format
        await generatePDF(codes, format);
      } catch (err) {
        // Handle authentication redirect
        if (shouldRedirectToLogin(err)) {
          globalThis.location.href = "/auth";
          return;
        }

        // Set user-friendly error message
        const errorMessage =
          err instanceof ApiError ? getUserFriendlyErrorMessage(err) : "Wystąpił nieoczekiwany błąd. Spróbuj ponownie.";

        setError(errorMessage);
        log.error("useQRCodeGeneration error", { error: err, workspaceId, quantity });
      } finally {
        setIsLoading(false);
      }
    },
    [workspaceId, generatePDF]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isLoading,
    error,
    generatedCodes,
    generateAndDownloadPDF,
    clearError,
  };
}
