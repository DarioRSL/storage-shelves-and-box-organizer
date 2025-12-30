import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { QrCodeDetailDto } from "@/types";

export interface QRCodeSelectorProps {
  value: string | null;
  onChange: (qrCodeId: string | null) => void;
  onBlur?: () => void;
  error?: string;
  disabled?: boolean;
  workspaceId: string;
  isLoading?: boolean;
  isEditing?: boolean;
  currentQRCode?: string;
  availableQRCodes?: QrCodeDetailDto[];
  onGenerateBatch?: () => Promise<void>;
}

/**
 * QRCodeSelector - Selector for assigning free QR codes to boxes.
 * Displays available QR codes with option to generate new batch.
 * In edit mode, shows current assigned QR code as read-only.
 */
export function QRCodeSelector({
  value,
  onChange,
  onBlur,
  error,
  disabled = false,
  isLoading = false,
  isEditing = false,
  currentQRCode,
  availableQRCodes = [],
  onGenerateBatch,
}: QRCodeSelectorProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateBatch = async () => {
    if (!onGenerateBatch) return;

    setIsGenerating(true);
    try {
      await onGenerateBatch();
    } finally {
      setIsGenerating(false);
    }
  };

  // In edit mode with current QR, show read-only display
  if (isEditing && currentQRCode) {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-900 dark:text-gray-100">QR Code</label>
        <div className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300">
          <span className="font-mono">{currentQRCode}</span>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            QR code is assigned to this box and cannot be changed.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label htmlFor="box-qr-code" className="block text-sm font-medium text-gray-900 dark:text-gray-100">
        QR Code (Optional)
      </label>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
          <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Loading QR codes...</span>
        </div>
      ) : availableQRCodes && availableQRCodes.length > 0 ? (
        <div className="space-y-3">
          <select
            id="box-qr-code"
            value={value || ""}
            onChange={(e) => onChange(e.target.value || null)}
            onBlur={onBlur}
            disabled={disabled}
            className={`w-full px-3 py-2 border rounded-md text-sm transition-colors ${
              error
                ? "border-red-500 bg-red-50 dark:bg-red-950"
                : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
            } text-gray-900 dark:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            aria-invalid={!!error}
            aria-describedby={error ? "box-qr-code-error" : undefined}
          >
            <option value="">Choose a QR code...</option>
            {availableQRCodes.map((qr) => (
              <option key={qr.id} value={qr.id}>
                {qr.short_id}
              </option>
            ))}
          </select>

          {value && (
            <p className="text-xs text-blue-600 dark:text-blue-400">
              Selected: {availableQRCodes.find((qr) => qr.id === value)?.short_id}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3 p-4 border border-dashed border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-800">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            No available QR codes. Generate a batch to assign QR codes to boxes.
          </p>
          <Button
            type="button"
            onClick={handleGenerateBatch}
            disabled={isGenerating || !onGenerateBatch}
            variant="outline"
            size="sm"
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Generate QR Codes
              </>
            )}
          </Button>
        </div>
      )}

      {error && (
        <p id="box-qr-code-error" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
