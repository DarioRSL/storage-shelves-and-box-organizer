import { useState, useEffect, useRef } from "react";
import type { BoxQrCodeSummary } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { log } from "@/lib/services/logger.client";

interface QrCodeDisplayProps {
  qrCode?: BoxQrCodeSummary | null;
}

export function QrCodeDisplay({ qrCode }: QrCodeDisplayProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!qrCode?.short_id) {
      setQrDataUrl(null);
      return;
    }

    const generateQrCode = async () => {
      setIsGenerating(true);
      try {
        const QRCode = await import("qrcode");
        const scanUrl = `${globalThis.location.origin}/app/scan?code=${qrCode.short_id}`;
        const dataUrl = await QRCode.toDataURL(scanUrl, {
          errorCorrectionLevel: "H",
          type: "image/png",
          width: 200,
          margin: 2,
        });
        setQrDataUrl(dataUrl);
      } catch (error) {
        log.error("Failed to generate QR code", { error, qrCodeId: qrCode.short_id });
        setQrDataUrl(null);
      } finally {
        setIsGenerating(false);
      }
    };

    generateQrCode();
  }, [qrCode?.short_id]);

  const handlePrint = () => {
    if (!printRef.current || !qrDataUrl || !qrCode) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Proszę zezwolić na wyskakujące okna, aby wydrukować kod QR");
      return;
    }

    // Build document using DOM methods
    const doc = printWindow.document;

    // Create style element
    const style = doc.createElement("style");
    style.textContent = `
      body {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        margin: 0;
        padding: 20px;
        font-family: system-ui, -apple-system, sans-serif;
      }
      .qr-container {
        text-align: center;
      }
      .qr-image {
        width: 200px;
        height: 200px;
      }
      .short-id {
        margin-top: 16px;
        font-size: 18px;
        font-weight: bold;
        letter-spacing: 1px;
      }
      @media print {
        body {
          min-height: auto;
        }
      }
    `;
    doc.head.appendChild(style);

    // Set title
    doc.title = `Kod QR - ${qrCode.short_id}`;

    // Create container
    const container = doc.createElement("div");
    container.className = "qr-container";

    // Create image
    const img = doc.createElement("img");
    img.src = qrDataUrl;
    img.alt = `Kod QR ${qrCode.short_id}`;
    img.className = "qr-image";
    container.appendChild(img);

    // Create label
    const label = doc.createElement("div");
    label.className = "short-id";
    label.textContent = qrCode.short_id;
    container.appendChild(label);

    doc.body.appendChild(container);

    // Print and close
    printWindow.onload = () => {
      printWindow.print();
      printWindow.onafterprint = () => {
        printWindow.close();
      };
    };

    // Fallback for browsers that don't trigger onload properly
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  // No QR code assigned
  if (!qrCode) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
              />
            </svg>
            Kod QR
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground italic">Pudełko nie ma przypisanego kodu QR</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
            />
          </svg>
          Kod QR
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div ref={printRef} className="flex flex-col items-center gap-4">
          {/* QR Code Image */}
          <div className="bg-white p-4 rounded-lg shadow-sm">
            {isGenerating ? (
              <div className="w-[200px] h-[200px] flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : qrDataUrl ? (
              <img src={qrDataUrl} alt={`Kod QR ${qrCode.short_id}`} className="w-[200px] h-[200px]" />
            ) : (
              <div className="w-[200px] h-[200px] flex items-center justify-center text-muted-foreground">
                Błąd generowania kodu QR
              </div>
            )}
          </div>

          {/* Short ID Label */}
          <div className="text-center">
            <span className="text-lg font-mono font-bold tracking-wider">{qrCode.short_id}</span>
          </div>

          {/* Print Button */}
          <Button variant="outline" onClick={handlePrint} disabled={!qrDataUrl || isGenerating} className="gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
              />
            </svg>
            Drukuj kod QR
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
