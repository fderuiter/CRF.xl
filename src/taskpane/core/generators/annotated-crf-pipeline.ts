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
} from "../types/annotated-crf";
import { parseExcelToStudyDesign } from "../parser/excel-parser";
import { loadAnnotationsFromStore } from "../services/annotation-service";
import { buildAnnotatedCrfDocument } from "../services/acrf-renderer";
import { generatePdfBlob } from "./pdf/pdf-builder";
import * as CryptoJS from "crypto-js";

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
        const doc = buildAnnotatedCrfDocument(
          stage1.data.studyDesign,
          stage1.data.validationIssues,
          stage2.data
        );
        return doc;
      });

      // Stage 4: Render model build
      await this.executeStage("Render Model Build", async () => {
        // This stage prepares any additional data needed specifically for rendering
        // For now, it just returns the document
        return stage3.data;
      });

      // Stage 5: Export artifact generation handoff
      const stage5 = await this.executeStage("Export Artifact Generation", async () => {
        const blob = await generatePdfBlob(
          stage1.data.studyDesign,
          stage1.data.validationIssues,
          undefined,
          undefined,
          stage3.data
        );
        return blob;
      });

      // Stage 6: Verification manifest generation
      const manifest = this.generateManifest(stage1.data.studyDesign);

      return {
        document: stage3.data,
        manifest: manifest,
        blob: stage5.data,
      };
    } catch (error) {
      this.addDiagnostic("Pipeline", "error", `Pipeline failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  private async executeStage<T>(name: string, action: () => Promise<T>): Promise<PipelineStageResult<T>> {
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
        diagnostics: this.diagnostics.filter(d => d.stage === name),
        durationMs: duration,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.addDiagnostic(name, "error", `Stage failed: ${name}. Error: ${message}`);
      throw error;
    }
  }

  private addDiagnostic(stage: string, severity: "info" | "warning" | "error", message: string, metadata?: any): void {
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
}
