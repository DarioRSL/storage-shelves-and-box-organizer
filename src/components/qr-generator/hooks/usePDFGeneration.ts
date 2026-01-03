import { useCallback } from "react";
import { LABEL_FORMATS, type QrCodeGeneratedItem, type LabelFormat } from "@/types";

/**
 * Hook for generating and downloading PDF with QR codes.
 * Supports multiple label formats: A4 grid and Brother label printer formats.
 */
export function usePDFGeneration() {
  const generatePDF = useCallback(async (codes: QrCodeGeneratedItem[], format: LabelFormat = "a4-grid") => {
    if (codes.length === 0) {
      throw new Error("Brak kodów do wygenerowania PDF");
    }

    const formatConfig = LABEL_FORMATS[format];

    // Dynamic imports to reduce initial bundle size
    const { jsPDF } = await import("jspdf");
    const QRCode = await import("qrcode");

    // Create PDF with appropriate page size
    const doc = new jsPDF({
      orientation: formatConfig.pageWidth > formatConfig.pageHeight ? "landscape" : "portrait",
      unit: "mm",
      format: [formatConfig.pageWidth, formatConfig.pageHeight],
    });

    const dateStr = new Date().toISOString().split("T")[0];

    if (format === "a4-grid") {
      // A4 Grid layout: multiple codes per page
      await generateA4Grid(doc, codes, formatConfig, QRCode);
    } else {
      // Label printer format: one code per page/label
      await generateLabelFormat(doc, codes, formatConfig, QRCode);
    }

    // Generate filename with format, count and date
    const formatName = format === "a4-grid" ? "a4" : format.replace("brother-", "");
    const filename = `qr-codes-${formatName}-${codes.length}_${dateStr}.pdf`;

    // Trigger download
    doc.save(filename);
  }, []);

  return { generatePDF };
}

/**
 * Generate A4 grid layout with multiple QR codes per page
 */
async function generateA4Grid(
  doc: InstanceType<typeof import("jspdf").jsPDF>,
  codes: QrCodeGeneratedItem[],
  formatConfig: (typeof LABEL_FORMATS)["a4-grid"],
  QRCode: typeof import("qrcode")
) {
  const margin = 10;
  const usableWidth = formatConfig.pageWidth - 2 * margin;
  const usableHeight = formatConfig.pageHeight - 2 * margin;

  const cols = formatConfig.cols || 4;
  const rows = formatConfig.rows || 5;
  const codeWidth = usableWidth / cols;
  const codeHeight = usableHeight / rows;
  const qrSize = Math.min(codeWidth * 0.75, codeHeight * 0.65);
  const labelFontSize = 8;

  let codeIndex = 0;

  while (codeIndex < codes.length) {
    // Add new page if not first page
    if (codeIndex > 0 && codeIndex % (cols * rows) === 0) {
      doc.addPage();
    }

    for (let row = 0; row < rows && codeIndex < codes.length; row++) {
      for (let col = 0; col < cols && codeIndex < codes.length; col++) {
        const code = codes[codeIndex];

        // Calculate position centering QR code in cell
        const cellX = margin + col * codeWidth;
        const cellY = margin + row * codeHeight;
        const x = cellX + (codeWidth - qrSize) / 2;
        const y = cellY + 5;

        // Generate QR code as data URL
        const qrDataUrl = await QRCode.toDataURL(`${globalThis.location.origin}/app/scan?code=${code.short_id}`, {
          errorCorrectionLevel: "H",
          type: "image/png",
          width: 200,
          margin: 1,
        });

        // Add QR code image
        doc.addImage(qrDataUrl, "PNG", x, y, qrSize, qrSize);

        // Add label text below QR code
        const labelY = y + qrSize + 4;
        doc.setFontSize(labelFontSize);
        doc.setFont("helvetica", "bold");
        doc.text(code.short_id, cellX + codeWidth / 2, labelY, {
          align: "center",
        });

        codeIndex++;
      }
    }
  }
}

/**
 * Generate label printer format with one QR code per page/label
 */
async function generateLabelFormat(
  doc: InstanceType<typeof import("jspdf").jsPDF>,
  codes: QrCodeGeneratedItem[],
  formatConfig: (typeof LABEL_FORMATS)["brother-62x29"] | (typeof LABEL_FORMATS)["brother-62x100"],
  QRCode: typeof import("qrcode")
) {
  const { pageWidth, pageHeight, qrSize } = formatConfig;

  // Determine layout based on label size
  const isSmallLabel = pageHeight < 50; // 62x29mm
  const margin = isSmallLabel ? 2 : 5;

  for (let i = 0; i < codes.length; i++) {
    const code = codes[i];

    // Add new page for each label (except first)
    if (i > 0) {
      doc.addPage([pageWidth, pageHeight]);
    }

    // Generate QR code as data URL
    const qrDataUrl = await QRCode.toDataURL(`${globalThis.location.origin}/app/scan?code=${code.short_id}`, {
      errorCorrectionLevel: "H",
      type: "image/png",
      width: 300,
      margin: 1,
    });

    if (isSmallLabel) {
      // Small label (62x29mm): QR on left, text on right
      const qrX = margin;
      const qrY = (pageHeight - qrSize) / 2;

      doc.addImage(qrDataUrl, "PNG", qrX, qrY, qrSize, qrSize);

      // Text on right side
      const textX = qrX + qrSize + 3;
      const textY = pageHeight / 2;

      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(code.short_id, textX, textY, {
        align: "left",
        baseline: "middle",
      });
    } else {
      // Large label (62x100mm): QR centered with text below
      const qrX = (pageWidth - qrSize) / 2;
      const qrY = margin + 5;

      doc.addImage(qrDataUrl, "PNG", qrX, qrY, qrSize, qrSize);

      // Text below QR code
      const textY = qrY + qrSize + 8;
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(code.short_id, pageWidth / 2, textY, {
        align: "center",
      });
    }
  }
}