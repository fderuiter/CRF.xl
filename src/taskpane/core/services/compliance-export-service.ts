/**
 * @issue #28
 */
import JSZip from "jszip";
import * as CryptoJS from "crypto-js";
import { StudyDesign } from "../types/hierarchy";
import { StudyDiffReport } from "../types/diff";
import { generateOdmXml } from "../generators/cdisc/odm-builder";
import { generateDocxBlob } from "../generators/docx/docx-builder";
import { generatePdfBlob } from "../generators/pdf/pdf-builder";
import { ImportProvenance } from "./migration-pipeline";

import { diffStudyDesigns } from "./diff-engine";

export interface VerificationManifest {
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
   */
  static async createExportPackage(
    currentStudy: StudyDesign,
    baselineStudy: StudyDesign | null,
    validationIssues: any[] = [],
    options?: {
      source_provenance?: ImportProvenance;
      signedOffAt?: string | null;
      justifications?: Record<string, { reason: string; userId: string; timestamp: string }>;
    }
  ): Promise<Blob> {
    const zip = new JSZip();

    // 1. Generate DOCX
    const docxBlob = await generateDocxBlob(currentStudy);
    const docxArrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = reject;
      reader.readAsArrayBuffer(docxBlob);
    });
    const docxWord = CryptoJS.lib.WordArray.create(docxArrayBuffer as any);
    const docxHash = CryptoJS.SHA256(docxWord).toString(CryptoJS.enc.Hex);

    const protocolId = currentStudy.metadata.protocolId || "UNKNOWN";
    zip.file(`${protocolId}_Annotated_CRF.docx`, docxBlob);

    // 2. Generate Audit Summary
    let auditSummary: StudyDiffReport;
    if (baselineStudy) {
      auditSummary = diffStudyDesigns(baselineStudy, currentStudy);
    } else {
      auditSummary = diffStudyDesigns(currentStudy, currentStudy);
    }

    // PDF Generation
    const pdfBlob = await generatePdfBlob(currentStudy, validationIssues, auditSummary);
    const pdfArrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = reject;
      reader.readAsArrayBuffer(pdfBlob);
    });
    const pdfWord = CryptoJS.lib.WordArray.create(pdfArrayBuffer as any);
    const pdfHash = CryptoJS.SHA256(pdfWord).toString(CryptoJS.enc.Hex);
    zip.file(`${protocolId}_Annotated_CRF.pdf`, pdfBlob);

    // 3. Generate ODM XML
    const odmXml = await generateOdmXml(currentStudy);
    const odmHash = CryptoJS.SHA256(odmXml).toString(CryptoJS.enc.Hex);

    zip.file(`${protocolId || "UNKNOWN"}_ODM_Specification.xml`, odmXml);

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
    zip.file("verification-manifest.json", manifestJson);

    // 5. Package as ZIP
    const zipBlob = await zip.generateAsync({ type: "blob" });
    return zipBlob;
  }
}
