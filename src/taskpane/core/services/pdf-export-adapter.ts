/**
 * @issue #78
 */
import html2pdf from "html2pdf.js";

/**
 * Exports the provided HTML content to a PDF file.
 */
export async function exportToPdf(html: string, filename: string): Promise<void> {
  const element = document.createElement("div");
  element.innerHTML = html;

  const opt: any = {
    margin: [10, 10, 10, 10],
    filename: filename,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, logging: false },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    pagebreak: { mode: ["avoid-all", "css", "legacy"] },
  };

  try {
    await html2pdf().set(opt).from(element).save();
  } catch (error) {
    console.error("[PdfExportAdapter] Failed to export PDF", error);
    throw error;
  }
}

/**
 * Generates a PDF blob from the provided HTML content.
 */
export async function generatePdfBlobFromHtml(html: string): Promise<Blob> {
  const element = document.createElement("div");
  element.innerHTML = html;

  const opt: any = {
    margin: [10, 10, 10, 10],
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, logging: false },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    pagebreak: { mode: ["avoid-all", "css", "legacy"] },
  };

  try {
    const pdfWorker = html2pdf().set(opt).from(element).outputPdf("blob");
    return await pdfWorker;
  } catch (error) {
    console.error("[PdfExportAdapter] Failed to generate PDF blob", error);
    throw error;
  }
}
