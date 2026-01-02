import { useState } from "react";
import { Button } from "../ui/button";

interface ExportDataButtonProps {
  workspaceId: string;
  isLoading?: boolean;
  onError?: (error: string) => void;
}

export function ExportDataButton({ workspaceId, isLoading: externalLoading = false, onError }: ExportDataButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (!workspaceId) {
      onError?.("No workspace selected");
      return;
    }

    setIsExporting(true);

    try {
      const response = await fetch(`/api/export/inventory?workspace_id=${workspaceId}`, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to export data");
      }

      const blob = await response.blob();

      if (blob.size === 0) {
        onError?.("No data to export");
        setIsExporting(false);
        return;
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `inventory-export-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to export data";
      onError?.(message);
    } finally {
      setIsExporting(false);
    }
  };

  const isLoading = externalLoading || isExporting;

  return (
    <Button
      onClick={handleExport}
      disabled={isLoading || !workspaceId}
      variant="outline"
      className="gap-2"
      aria-label="Export inventory data to CSV"
    >
      {isLoading ? (
        <>
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          Exporting...
        </>
      ) : (
        <>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export Data
        </>
      )}
    </Button>
  );
}
