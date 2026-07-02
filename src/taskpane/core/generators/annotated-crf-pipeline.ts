/**
 * Annotated CRF Generation Pipeline
 * Executes the 6 stages of aCRF generation:
 * 1. Source model snapshot
 * 2. Annotation resolution
 * 3. Normalized document structure build
 * 4. Render model build
 * 5. Export artifact generation handoff
 * 6. Verification manifest generation
 *
 * @issue #184
 */

import { StudyDesign } from "../types/hierarchy";
import {
  AnnotatedCrfPipelineResult,
  AnnotatedCrfPipelineManifest,
  PipelineDiagnostic,
  PipelineStageResult,
  AcrfVerificationResult,
  AnnotatedCrfDocument,
} from "../types/annotated-crf";
import { parseExcelToStudyDesign } from "../parser/excel-parser";
import { loadAnnotationsFromStore } from "../services/annotation-service";
import { loadComments } from "../services/review-service";
import { buildAnnotatedCrfDocument, renderToHtml } from "../services/acrf-renderer";
import { generatePdfBlobFromHtml } from "../services/pdf-export-adapter";
import { verifyAnnotatedCrf } from "../validators/acrf-output-validator";
import * as CryptoJS from "crypto-js";
import HTMLtoDOCX from "html-to-docx";

export class AnnotatedCrfPipeline {
  private diagnostics: PipelineDiagnostic[] = [];
  private stages: string[] = [];
  private startTime: number = 0;

  constructor() {
    this.startTime = Date.now();
  }

  /**
   * Executes the full pipeline.
   */
  public async execute(): Promise<AnnotatedCrfPipelineResult> {
    try {
      // Stage 1: Source model snapshot
      const stage1 = await this.executeStage("Source Model Snapshot", async () => {
        const { studyDesign, validationIssues } = await parseExcelToStudyDesign();
        return { studyDesign, validationIssues };
      });

      // Stage 2: Annotation resolution
      const stage2 = await this.executeStage("Annotation Resolution", async () => {
        const annotations = await loadAnnotationsFromStore();
        return annotations;
      });

      // Stage 3: Normalized document structure build
      const stage3 = await this.executeStage("Document Structure Build", async () => {
        const reviewerComments = await loadComments();
        const doc = buildAnnotatedCrfDocument(
          stage1.data.studyDesign,
          stage1.data.validationIssues,
          stage2.data,
          reviewerComments
        );
        return doc;
      });

      // Stage 4: Output Verification
      const verification = await this.executeStage("Output Verification", async () => {
        const result = verifyAnnotatedCrf(stage1.data.studyDesign, stage3.data);
        if (!result.isValid) {
          this.addDiagnostic(
            "Output Verification",
            "error",
            `Verification failed: ${result.summary.errorCount} errors found.`
          );
        }
        return result;
      });

      // Stage 5: Render model build
      await this.executeStage("Render Model Build", async () => {
        // This stage prepares any additional data needed specifically for rendering
        // For now, it just returns the document
        return stage3.data;
      });

      // Stage 6: Export artifact generation handoff
      let pdfBlob: Blob | undefined = undefined;
      let docxBlob: Blob | undefined = undefined;

      if (verification.data.isValid) {
        const stage6 = await this.executeStage("Export Artifact Generation", async () => {
          const htmlContent = renderToHtml(stage3.data);

          const generatedPdf = await generatePdfBlobFromHtml(htmlContent);

          const generatedDocx = await HTMLtoDOCX(htmlContent, null, {
            table: { row: { cantSplit: true } },
            footer: true,
            pageNumber: true,
          });

          return { pdf: generatedPdf, docx: generatedDocx };
        });
        pdfBlob = stage6.data.pdf;
        docxBlob = stage6.data.docx as Blob;
      } else {
        this.addDiagnostic(
          "Export Artifact Generation",
          "warning",
          "Export skipped due to verification errors."
        );
      }

      // Stage 7: Verification manifest generation
      const manifest = this.generateManifest(stage1.data.studyDesign);

      // Final: Generate Human Readable Reports
      const humanReadableReport = this.generateHumanReadableReport(verification.data);
      const metadataSummary = this.generateMetadataSummary(stage3.data);

      return {
        document: stage3.data,
        manifest: manifest,
        verificationResult: verification.data,
        blob: pdfBlob, // Keep legacy field for backwards compatibility
        pdfBlob: pdfBlob,
        docxBlob: docxBlob,
        humanReadableReport,
        metadataSummary,
      };
    } catch (error) {
      this.addDiagnostic(
        "Pipeline",
        "error",
        `Pipeline failed: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  private async executeStage<T>(
    name: string,
    action: () => Promise<T>
  ): Promise<PipelineStageResult<T>> {
    const stageStart = Date.now();
    this.stages.push(name);
    this.addDiagnostic(name, "info", `Starting stage: ${name}`);

    try {
      const data = await action();
      const duration = Date.now() - stageStart;
      this.addDiagnostic(name, "info", `Completed stage: ${name}`, { durationMs: duration });

      return {
        stage: name,
        data,
        diagnostics: this.diagnostics.filter((d) => d.stage === name),
        durationMs: duration,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.addDiagnostic(name, "error", `Stage failed: ${name}. Error: ${message}`);
      throw error;
    }
  }

  private addDiagnostic(
    stage: string,
    severity: "info" | "warning" | "error",
    message: string,
    metadata?: any
  ): void {
    this.diagnostics.push({
      stage,
      severity,
      message,
      timestamp: new Date().toISOString(),
      metadata,
    });
  }

  private generateManifest(study: StudyDesign): AnnotatedCrfPipelineManifest {
    const artifactHash = CryptoJS.SHA256(JSON.stringify(study)).toString(CryptoJS.enc.Hex);

    return {
      pipelineVersion: "1.0.0",
      generatedAt: new Date().toISOString(),
      protocolId: study.metadata.protocolId || "UNKNOWN",
      studyVersion: study.metadata.version || "UNKNOWN",
      stages: this.stages,
      totalDurationMs: Date.now() - this.startTime,
      diagnostics: this.diagnostics,
      artifactHashes: {
        "acrf-pdf": artifactHash,
      },
    };
  }

  private generateHumanReadableReport(result: AcrfVerificationResult): string {
    let report = "Annotated CRF Verification Report\n";
    report += "=================================\n\n";
    report += `Status: ${result.isValid ? "PASS" : "FAIL"}\n`;
    report += `Generated At: ${new Date().toISOString()}\n\n`;
    report += "Summary:\n";
    report += ` - Errors: ${result.summary.errorCount}\n`;
    report += ` - Warnings: ${result.summary.warningCount}\n`;
    report += ` - Total Checks: ${result.summary.totalChecks}\n\n`;

    if (result.issues.length > 0) {
      report += "Findings:\n";
      result.issues.forEach((issue, idx) => {
        report += `${idx + 1}. [${issue.severity.toUpperCase()}] [${issue.category}] ${issue.message}\n`;
        if (issue.entityId) report += `    Entity: ${issue.entityId}\n`;
        if (issue.location) report += `    Location: ${issue.location}\n`;
      });
    } else {
      report += "No issues found.\n";
    }

    return report;
  }

  private generateMetadataSummary(doc: AnnotatedCrfDocument): string {
    let summary = "aCRF Metadata Summary\n";
    summary += "=====================\n\n";
    summary += `Protocol ID: ${doc.protocolId}\n`;
    summary += `Study Name: ${doc.studyName}\n`;
    summary += `Version: ${doc.version}\n`;
    summary += `Sponsor: ${doc.sponsor || "N/A"}\n\n`;

    summary += "Structure:\n";
    summary += ` - Total Forms: ${doc.forms.length}\n`;

    let totalGroups = 0;
    let totalItems = 0;
    let totalAnnotations = 0;

    doc.forms.forEach((f) => {
      totalGroups += f.itemGroups.length;
      f.itemGroups.forEach((g) => {
        totalItems += g.items.length;
        g.items.forEach((i) => {
          totalAnnotations += i.annotations.length;
        });
      });
    });

    summary += ` - Total Item Groups: ${totalGroups}\n`;
    summary += ` - Total Items: ${totalItems}\n`;
    summary += ` - Total Annotations: ${totalAnnotations}\n\n`;

    summary += "Forms Detail:\n";
    doc.forms.forEach((f) => {
      summary += ` - ${f.formName} (${f.formOid}): ${f.itemGroups.length} groups, ${f.itemGroups.reduce((acc, g) => acc + g.items.length, 0)} items\n`;
    });

    return summary;
  }
}
