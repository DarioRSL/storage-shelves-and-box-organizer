import { useState, useCallback, useId } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ValidationRules, LABEL_FORMATS, type QRGeneratorFormProps, type LabelFormat } from "@/types";

/**
 * Form component for specifying QR code quantity, format and triggering generation.
 * Handles input validation and loading state.
 */
export const QRGeneratorForm: React.FC<QRGeneratorFormProps> = ({
  onSubmit,
  isLoading,
  defaultQuantity = 20,
  maxQuantity = ValidationRules.qrCodes.MAX_BATCH_QUANTITY,
}) => {
  const [quantity, setQuantity] = useState<number>(defaultQuantity);
  const [format, setFormat] = useState<LabelFormat>("a4-grid");
  const [touched, setTouched] = useState<boolean>(false);
  const inputId = useId();
  const errorId = useId();
  const formatGroupId = useId();

  const minQuantity = ValidationRules.qrCodes.MIN_BATCH_QUANTITY;

  // Validation
  const getValidationError = useCallback(
    (value: number): string | null => {
      if (isNaN(value)) {
        return "Podaj prawidłową liczbę";
      }
      if (value < minQuantity) {
        return `Minimalna liczba kodów to ${minQuantity}`;
      }
      if (value > maxQuantity) {
        return `Maksymalna liczba kodów to ${maxQuantity}`;
      }
      return null;
    },
    [minQuantity, maxQuantity]
  );

  const validationError = touched ? getValidationError(quantity) : null;
  const isValid = getValidationError(quantity) === null;

  const handleQuantityChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setQuantity(isNaN(value) ? 0 : value);
  }, []);

  const handleBlur = useCallback(() => {
    setTouched(true);
  }, []);

  const handleFormatChange = useCallback((value: string) => {
    setFormat(value as LabelFormat);
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setTouched(true);

      if (!isValid || isLoading) {
        return;
      }

      await onSubmit(quantity, format);
    },
    [quantity, format, isValid, isLoading, onSubmit]
  );

  const formatOptions = Object.values(LABEL_FORMATS);

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Format Selection */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Format etykiet</Label>
            <RadioGroup
              value={format}
              onValueChange={handleFormatChange}
              className="space-y-3"
              aria-labelledby={formatGroupId}
              disabled={isLoading}
            >
              {formatOptions.map((option) => (
                <div
                  key={option.id}
                  className={`flex items-start space-x-3 rounded-lg border p-4 transition-colors ${
                    format === option.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                  } ${isLoading ? "opacity-50" : ""}`}
                >
                  <RadioGroupItem value={option.id} id={option.id} className="mt-0.5" />
                  <div className="flex-1">
                    <Label htmlFor={option.id} className="cursor-pointer font-medium">
                      {option.name}
                    </Label>
                    <p className="mt-1 text-sm text-muted-foreground">{option.description}</p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Quantity Input */}
          <div className="space-y-2">
            <Label htmlFor={inputId} className="text-base font-medium">
              Liczba kodów QR
            </Label>
            <div className="flex items-center gap-4">
              <Input
                id={inputId}
                type="number"
                value={quantity}
                onChange={handleQuantityChange}
                onBlur={handleBlur}
                min={minQuantity}
                max={maxQuantity}
                step={1}
                disabled={isLoading}
                className={`w-32 text-center text-lg ${validationError ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                aria-invalid={validationError ? "true" : "false"}
                aria-describedby={validationError ? errorId : undefined}
              />
              <span className="text-sm text-muted-foreground">
                (od {minQuantity} do {maxQuantity})
              </span>
            </div>
            {validationError && (
              <p id={errorId} className="text-sm text-red-600 dark:text-red-400" role="alert">
                {validationError}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            size="lg"
            disabled={!isValid || isLoading}
            className="w-full sm:w-auto"
            aria-busy={isLoading}
          >
            {isLoading ? (
              <>
                <svg className="-ml-1 mr-2 h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Generowanie...
              </>
            ) : (
              <>
                <svg
                  className="-ml-1 mr-2 h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Generuj i pobierz PDF
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
