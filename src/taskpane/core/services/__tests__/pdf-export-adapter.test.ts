/**
 * @issue #78
 */
import { exportToPdf, generatePdfBlobFromHtml } from "../pdf-export-adapter";
import * as pdfMake from "pdfmake/build/pdfmake";

jest.mock("pdfmake/build/pdfmake", () => ({
  createPdf: jest.fn(),
}));

jest.mock("html-to-pdfmake", () => jest.fn(() => ({})));

describe("PdfExportAdapter", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should gracefully reject exportToPdf when pdfMake takes longer than 15 seconds", async () => {
    // Mock pdfMake to do nothing, simulating a hang
    (pdfMake.createPdf as jest.Mock).mockReturnValue({
      download: jest.fn(),
    });

    const promise = exportToPdf("<h1>Test</h1>", "test.pdf");

    // Advance time by 15 seconds
    jest.advanceTimersByTime(15000);

    await expect(promise).rejects.toThrow("PDF generation timed out after 15 seconds");
  });

  it("should gracefully reject generatePdfBlobFromHtml when pdfMake fails", async () => {
    // Mock pdfMake to throw an error immediately
    (pdfMake.createPdf as jest.Mock).mockImplementation(() => {
      throw new Error("Layout generation failed");
    });

    const promise = generatePdfBlobFromHtml("<h1>Test</h1>");

    await expect(promise).rejects.toThrow("Layout generation failed");
  });
});
