import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ValidationRules } from "@/types";

interface InstructionsPanelProps {
  maxQuantity?: number;
}

/**
 * Static panel with instructions for the QR code generation process.
 * Explains steps and limits to the user.
 */
export const InstructionsPanel: React.FC<InstructionsPanelProps> = ({
  maxQuantity = ValidationRules.qrCodes.MAX_BATCH_QUANTITY,
}) => {
  return (
    <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg text-blue-900 dark:text-blue-100">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Jak wygenerować kody QR
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ol className="list-inside list-decimal space-y-2 text-sm text-blue-800 dark:text-blue-200">
          <li>Podaj liczbę kodów do wygenerowania (1-{maxQuantity})</li>
          <li>Kliknij przycisk &quot;Generuj i pobierz PDF&quot;</li>
          <li>Poczekaj na wygenerowanie arkusza</li>
          <li>Plik PDF zostanie automatycznie pobrany</li>
          <li>Wydrukuj arkusz na domowej drukarce (format A4)</li>
          <li>Wytnij etykiety i przyklej do pudełek</li>
        </ol>

        <div className="flex items-start gap-2 rounded-md bg-blue-100 p-3 dark:bg-blue-900/30">
          <svg
            className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600 dark:text-blue-400"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
          <div className="text-xs text-blue-700 dark:text-blue-300">
            <p className="font-medium">Informacja</p>
            <p className="mt-1">
              Każdy kod jest unikalny i może zostać przypisany do jednego pudełka. Maksymalnie można wygenerować{" "}
              {maxQuantity} kodów na raz.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
