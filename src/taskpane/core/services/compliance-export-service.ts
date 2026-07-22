/**
 * @issue #28
 */
import { ZipWriter } from "../utils/zip-writer";
import { sha256Native } from "../utils/crypto-utils";
import { StudyDesign } from "../types/hierarchy";
import { ExportOptions } from "../types/linguistics";
import { StudyDiffReport } from "../types/diff";
import { ImportProvenance } from "./migration-pipeline";

import { diffStudyDesigns } from "./diff-engine";

export interface ExportAdapterContext {
  currentStudy: StudyDesign;
  baselineStudy: StudyDesign | null;
  validationIssues: any[];
  auditSummary: StudyDiffReport;
  options?: {
    source_provenance?: ImportProvenance;
    signedOffAt?: string | null;
    justifications?: Record<string, { reason: string; userId: string; timestamp: string }>;
    exportOptions?: ExportOptions;
  };
}

export interface ExportAdapterResult {
  fileName: string;
  data: ArrayBuffer | Uint8Array;
}

export interface ExportAdapter {
  generate(context: ExportAdapterContext): Promise<ExportAdapterResult[]>;
}

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
  private static adapters: ExportAdapter[] = [];

  /**
   * Register a new export adapter.
   * @param adapter
   */
  static registerAdapter(adapter: ExportAdapter) {
    this.adapters.push(adapter);
  }

  /**
   * Generates a ZIP file containing the outputs of all registered export adapters and verification-manifest.json.
   * @param currentStudy
   * @param baselineStudy
   * @param validationIssues
   * @param options
   * @param options.source_provenance
   * @param options.signedOffAt
   * @param options.justifications
   * @param options.exportOptions
   * @returns {Promise<Blob>} A ZIP package containing export files
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
    const rawProtocolId = currentStudy.metadata.protocolId || "UNKNOWN";
    const protocolId = rawProtocolId.replace(/[\/\\]/g, "_").replace(/\.\./g, "__");

    let auditSummary: StudyDiffReport;
    if (baselineStudy) {
      auditSummary = diffStudyDesigns(baselineStudy, currentStudy);
    } else {
      auditSummary = diffStudyDesigns(currentStudy, currentStudy);
    }

    const context: ExportAdapterContext = {
      currentStudy,
      baselineStudy,
      validationIssues,
      auditSummary,
      options,
    };

    const fileHashes: Record<string, string> = {};

    for (const adapter of this.adapters) {
      const results = await adapter.generate(context);
      for (const result of results) {
        let buffer: ArrayBuffer;
        let uint8Array: Uint8Array;

        if (result.data instanceof Uint8Array) {
          uint8Array = result.data;
          buffer = uint8Array.buffer.slice(
            uint8Array.byteOffset,
            uint8Array.byteOffset + uint8Array.byteLength
          ) as ArrayBuffer;
        } else {
          buffer = result.data as ArrayBuffer;
          uint8Array = new Uint8Array(buffer);
        }

        const hash = await sha256Native(buffer);
        fileHashes[result.fileName] = hash;
        await zip.addFile(result.fileName, uint8Array);
      }
    }

    const manifest: VerificationManifest = {
      manifestVersion: "1.0",
      protocolId,
      exportedAt: new Date().toISOString(),
      signedOffAt: options?.signedOffAt ?? undefined,
      source_provenance: options?.source_provenance,
      fileHashes,
      auditSummary,
      justifications: options?.justifications,
    };

    const encoder = new TextEncoder();
    const manifestJson = JSON.stringify(manifest, null, 2);
    await zip.addFile("verification-manifest.json", encoder.encode(manifestJson));

    return zip.generate();
  }
}
