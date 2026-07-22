/**
 * @issue #28
 */
import { ZipWriter } from "../utils/zip-writer";
import { sha256Native } from "../utils/crypto-utils";
import { StudyDesign } from "../types/hierarchy";
import { ExportOptions } from "../types/linguistics";
import { StudyDiffReport } from "../types/diff";
import { generateOdmXml } from "../generators/cdisc/odm-builder";
import { generateDocxBlob } from "../generators/docx/docx-builder";
import { generatePdfBlob } from "../generators/pdf/pdf-builder";
import { ImportProvenance } from "./migration-pipeline";

import { diffStudyDesigns } from "./diff-engine";

interface VerificationManifest {
  manifestVersion: string;
  protocolId: string;
  exportedAt: string;
  signedOffAt?: string;
  source_provenance?: ImportProvenance;
  fileHashes: Record<string, string>;
  auditSummary: StudyDiffReport;
  justifications?: Record<string, { reason: string; userId: string; timestamp: string }>;
}

export class ComplianceExportService {
  /**
   * Generates a ZIP file containing the DOCX, ODM XML, and verification-manifest.json.
   * Creates SHA-256 hashes for DOCX and ODM before generating the manifest.
   * @param currentStudy
   * @param baselineStudy
   * @param validationIssues
   * @param options
   * @param options.source_provenance
   * @param options.signedOffAt
   * @param options.justifications
   * @param options.exportOptions
   * @returns
   */
  static async createExportPackage(
    currentStudy: StudyDesign,
    baselineStudy: StudyDesign | null,
    validationIssues: any[] = [],
    options?: {
      source_provenance?: ImportProvenance;
      signedOffAt?: string | null;
      justifications?: Record<string, { reason: string; userId: string; timestamp: string }>;
      exportOptions?: ExportOptions;
    }
  ): Promise<Blob> {
    const zip = new ZipWriter();

    // 1. Generate DOCX
    const docxBlob = await generateDocxBlob(currentStudy, options?.exportOptions);
    const docxArrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = reject;
      reader.readAsArrayBuffer(docxBlob);
    });
    const docxHash = await sha256Native(docxArrayBuffer);

    const protocolId = currentStudy.metadata.protocolId || "UNKNOWN";
    await zip.addFile(
      `${protocolId}_Annotated_CRF.docx`,
      new Uint8Array(docxArrayBuffer as ArrayBuffer)
    );

    // 2. Generate Audit Summary
    let auditSummary: StudyDiffReport;
    if (baselineStudy) {
      auditSummary = diffStudyDesigns(baselineStudy, currentStudy);
    } else {
      auditSummary = diffStudyDesigns(currentStudy, currentStudy);
    }

    // PDF Generation
    const pdfBlob = await generatePdfBlob(
      currentStudy,
      validationIssues,
      auditSummary,
      options?.exportOptions
    );
    const pdfArrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = reject;
      reader.readAsArrayBuffer(pdfBlob);
    });
    const pdfHash = await sha256Native(pdfArrayBuffer);
    await zip.addFile(
      `${protocolId}_Annotated_CRF.pdf`,
      new Uint8Array(pdfArrayBuffer as ArrayBuffer)
    );

    // 3. Generate ODM XML
    const { xml: odmXml, diagnostics } = await generateOdmXml(currentStudy, {
      bestEffort: true,
      exportOptions: options?.exportOptions,
    });
    const odmHash = await sha256Native(odmXml);

    const encoder = new TextEncoder();
    await zip.addFile(`${protocolId || "UNKNOWN"}_ODM_Specification.xml`, encoder.encode(odmXml));
    if (diagnostics) {
      await zip.addFile(
        `${protocolId || "UNKNOWN"}_ODM_Diagnostics.txt`,
        encoder.encode(diagnostics)
      );
    }

    // 4. Create Verification Manifest
    const manifest: VerificationManifest = {
      manifestVersion: "1.0",
      protocolId: currentStudy.metadata.protocolId || "UNKNOWN",
      exportedAt: new Date().toISOString(),
      signedOffAt: options?.signedOffAt ?? undefined,
      source_provenance: options?.source_provenance,
      fileHashes: {
        [`${protocolId || "UNKNOWN"}_Annotated_CRF.docx`]: docxHash,
        [`${protocolId || "UNKNOWN"}_Annotated_CRF.pdf`]: pdfHash,
        [`${protocolId || "UNKNOWN"}_ODM_Specification.xml`]: odmHash,
      },
      auditSummary,
      justifications: options?.justifications,
    };

    const manifestJson = JSON.stringify(manifest, null, 2);
    await zip.addFile("verification-manifest.json", encoder.encode(manifestJson));

    // 5. Package as ZIP
    const zipBlob = zip.generate();
    return zipBlob;
  }
}
