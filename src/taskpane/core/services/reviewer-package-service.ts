/**
 * Reviewer Package Service
 * Orchestrates the assembly of the Reviewer Package ZIP archive.
 * @issue #56
 */
import { ZipWriter } from "../utils/zip-writer";
import { AnnotatedCrfPipelineResult } from "../types/annotated-crf";

export class ReviewerPackageService {
  /**
   * Generates a ZIP file containing the Annotated CRF PDF, Manifest, Verification Report, and Metadata Summary.
   * @param result
   * @returns
   */
  static async createReviewerPackage(result: AnnotatedCrfPipelineResult): Promise<Blob> {
    const zip = new ZipWriter();
    const encoder = new TextEncoder();

    const rawProtocolId = result.document.protocolId || "UNKNOWN";
    const protocolId = rawProtocolId.replace(/[\/\\]/g, "_").replace(/\.\./g, "__");
    const version = (result.document.version || "v1.0").replace(/[\/\\]/g, "_").replace(/\.\./g, "__");
    const baseFilename = `${protocolId}_AnnotatedCRF_${version}`;

    // 1. Add PDF Artifact
    if (result.pdfBlob) {
      const pdfArrayBuffer = await result.pdfBlob.arrayBuffer();
      await zip.addFile(`${baseFilename}.pdf`, new Uint8Array(pdfArrayBuffer));
    }

    // 2. Add DOCX Artifact (if generated)
    if (result.docxBlob) {
      const docxArrayBuffer = await result.docxBlob.arrayBuffer();
      await zip.addFile(`${baseFilename}.docx`, new Uint8Array(docxArrayBuffer));
    }

    // 3. Add Verification Manifest (JSON)
    const manifestJson = JSON.stringify(result.manifest, null, 2);
    await zip.addFile("verification-manifest.json", encoder.encode(manifestJson));

    // 4. Add Human-Readable Verification Report
    if (result.humanReadableReport) {
      await zip.addFile("verification-report.txt", encoder.encode(result.humanReadableReport));
    }

    // 5. Add Metadata Summary
    if (result.metadataSummary) {
      await zip.addFile("metadata-summary.txt", encoder.encode(result.metadataSummary));
    }

    return zip.generate();
  }
}
