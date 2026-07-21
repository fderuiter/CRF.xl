import { logger } from "../utils/logger";
/**
 * @issue #78
 */
import * as pdfMake from "pdfmake/build/pdfmake";
const pdfFonts = require("pdfmake/build/vfs_fonts");
import htmlToPdfmake from "html-to-pdfmake";

(pdfMake as any).vfs = pdfFonts?.pdfMake?.vfs || pdfFonts?.vfs || {};

/**
 * Exports the provided HTML content to a PDF file.
 * @param html
 * @param filename
 */
export async function exportToPdf(html: string, filename: string): Promise<void> {
  const parsedHtml = htmlToPdfmake(html, {
    defaultStyles: {
      div: { margin: [0, 2, 0, 2] },
      h1: { fontSize: 24, bold: true, margin: [0, 0, 0, 20] },
      h2: { fontSize: 18, bold: true, margin: [0, 15, 0, 10] },
    },
  });

  const docDefinition: any = {
    content: parsedHtml,
    tagged: true,
    language: "en-US", // Accessibility requirement
    info: {
      title: filename.replace(".pdf", ""),
    },
    defaultStyle: {
      fontSize: 10,
    },
  };

  return new Promise((resolve, reject) => {
    try {
      (pdfMake.createPdf(docDefinition) as any).download(filename);
      resolve();
    } catch (error) {
      logger.error("[PdfExportAdapter] Failed to export PDF", error);
      reject(error);
    }
  });
}

/**
 * Generates a PDF blob from the provided HTML content.
 * @param html
 * @returns
 */
export async function generatePdfBlobFromHtml(html: string): Promise<Blob> {
  const parsedHtml = htmlToPdfmake(html, {
    defaultStyles: {
      div: { margin: [0, 2, 0, 2] },
      h1: { fontSize: 24, bold: true, margin: [0, 0, 0, 20] },
      h2: { fontSize: 18, bold: true, margin: [0, 15, 0, 10] },
    },
  });

  const docDefinition: any = {
    content: parsedHtml,
    tagged: true,
    language: "en-US", // Accessibility requirement
    info: {
      title: "Annotated CRF Export",
    },
    defaultStyle: {
      fontSize: 10,
    },
  };

  return new Promise((resolve, reject) => {
    try {
      (pdfMake.createPdf(docDefinition) as any).getBlob((blob: Blob) => {
        resolve(blob);
      });
    } catch (error) {
      logger.error("[PdfExportAdapter] Failed to generate PDF blob", error);
      reject(error);
    }
  });
}
