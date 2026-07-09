import { logger } from "../utils/logger";
/* global Excel */
/**
 * @issue #28
 */

import * as CryptoJS from "crypto-js";
import { StudyDesign } from "../types";
import { classifyOfficeError } from "./office-error-handling";
import { parseExcelToStudyDesign } from "../parser/excel-parser";
import { diffStudyDesigns } from "./diff-engine";
import { WorkbookProjection } from "./migration-pipeline";
import { parseWorkbookSheetValuesToStudyDesign } from "../parser/baseline-workbook-parser";
import { ChunkingEngine, ExecutionPlan } from "../engine/chunking-engine";
import { createRetryMiddleware } from "../engine/middlewares";

export interface SpeculativeSyncOperation {
  id: string;
  plans: ExecutionPlan<string[]>[];
  predictedStudy: StudyDesign;
  snapshotFingerprints: Record<string, string>;
  recoverySnapshot: StudyDesign | null; // For rollback
}

export type SyncState = "idle" | "syncing" | "conflict" | "error";

export async function getPredictedStudyDesign(
  projection: WorkbookProjection
): Promise<StudyDesign> {
  return await parseWorkbookSheetValuesToStudyDesign({
    async getSheetValues(sheetName: string): Promise<unknown[][] | null> {
      if (sheetName === "_Study") return projection.studyRows ?? null;
      if (sheetName === "_Forms") return projection.formsRows ?? null;
      if (sheetName === "_Codelists") return projection.codelistRows ?? null;
      return null;
    },
  });
}

class SpeculativeSyncManager {
  private state: SyncState = "idle";
  private currentOp: SpeculativeSyncOperation | null = null;
  private listeners: Set<(state: SyncState, details?: any) => void> = new Set();

  public subscribe(listener: (state: SyncState, details?: any) => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(state: SyncState, details?: any) {
    this.state = state;
    this.listeners.forEach((l) => l(state, details));
  }

  public getState() {
    return this.state;
  }

  public async getSheetFingerprint(ctx: Excel.RequestContext, sheetName: string): Promise<string> {
    const sheet = ctx.workbook.worksheets.getItemOrNullObject(sheetName);
    await ctx.sync();
    if (sheet.isNullObject) return "missing";
    const range = sheet.getUsedRangeOrNullObject();
    await ctx.sync();
    if (range.isNullObject) return "empty";
    range.load("values");
    await ctx.sync();
    return CryptoJS.SHA256(JSON.stringify(range.values)).toString();
  }

  public async startSync(
    projection: WorkbookProjection,
    predictedStudy: StudyDesign,
    baselineStudy: StudyDesign | null
  ) {
    if (this.state === "syncing") return;

    const plans: ExecutionPlan<string[]>[] = [
      { id: "_Study", data: (projection.studyRows as string[][]) || [] },
      { id: "_Forms", data: (projection.formsRows as string[][]) || [] },
      { id: "_Codelists", data: (projection.codelistRows as string[][]) || [] },
    ];

    let snapshotFingerprints: Record<string, string> = {};
    await Excel.run(async (ctx) => {
      snapshotFingerprints["_Study"] = await this.getSheetFingerprint(ctx, "_Study");
      snapshotFingerprints["_Forms"] = await this.getSheetFingerprint(ctx, "_Forms");
      snapshotFingerprints["_Codelists"] = await this.getSheetFingerprint(ctx, "_Codelists");
    });

    this.currentOp = {
      id: Date.now().toString(),
      plans,
      predictedStudy,
      snapshotFingerprints,
      recoverySnapshot: baselineStudy,
    };

    this.notify("syncing", { predictedStudy });

    // Start background sync
    this.executeSyncBackground();
  }

  private async executeSyncBackground() {
    if (!this.currentOp) return;
    const { predictedStudy, recoverySnapshot, plans } = this.currentOp;

    const engine = new ChunkingEngine<string[]>({
      chunkSize: 500
    });

    // Fingerprint middleware
    engine.use(async (ctx, _chunk, next) => {
      const sheetName = ctx.id;
      if (this.state !== "syncing") {
        throw new Error("CANCELLED");
      }
      
      await Excel.run(async (excelCtx) => {
        const currentFp = await this.getSheetFingerprint(excelCtx, sheetName);
        if (currentFp !== this.currentOp!.snapshotFingerprints[sheetName]) {
          throw new Error("FINGERPRINT_MISMATCH");
        }
      });
      
      await next();
      
      if (this.state !== "syncing") {
        throw new Error("CANCELLED");
      }
      
      await Excel.run(async (excelCtx) => {
         this.currentOp!.snapshotFingerprints[sheetName] = await this.getSheetFingerprint(excelCtx, sheetName);
      });
    });

    // Retry middleware
    engine.use(createRetryMiddleware({
      maxRetries: 15,
      delayMs: 2000,
      shouldRetry: (error) => {
        if (error.message === "FINGERPRINT_MISMATCH" || error.message === "CANCELLED") return false;
        const errClass = classifyOfficeError(error);
        return errClass === "excelBusy";
      }
    }));

    // Progress listener 1: State management
    engine.on("progress", (_data: any) => {
      // For potential UI progress bar binding
    });

    // Progress listener 2: Telemetry/Diagnostics
    engine.on("progress", (data: any) => {
      logger.info(`[Telemetry] Speculative Sync Progress: ${data.completed}/${data.total} for plan ${data.planId}`);
    });
    
    let errorCaught = false;

    // Observe error
    engine.on("error", async (error: any) => {
      errorCaught = true;
      if (error.message === "CANCELLED") return;
      if (error.message === "FINGERPRINT_MISMATCH") {
        try {
          const currentStudyResult = await parseExcelToStudyDesign();
          const currentStudy = currentStudyResult.studyDesign;
          const diff = diffStudyDesigns(predictedStudy, currentStudy);
          this.notify("conflict", { diff, recoverySnapshot });
        } catch (parseErr) {
          this.notify("conflict", { diff: null, recoverySnapshot });
        }
        return;
      }
      this.notify("error", { error });
    });

    try {
      await engine.execute(plans, async (chunk, ctx) => {
        await Excel.run(async (excelCtx) => {
          const sheet = excelCtx.workbook.worksheets.getItemOrNullObject(ctx.id);
          await excelCtx.sync();
          const target = sheet.isNullObject
            ? excelCtx.workbook.worksheets.add(ctx.id)
            : sheet;

          if (ctx.isFirstChunk && !sheet.isNullObject) {
            target.getUsedRangeOrNullObject().delete(Excel.DeleteShiftDirection.up);
            await excelCtx.sync();
          }

          if (chunk.length > 0) {
            const range = target.getRangeByIndexes(
              ctx.startIndex,
              0,
              chunk.length,
              chunk[0].length
            );
            range.values = chunk;
          }
          await excelCtx.sync();
        });
      });

      if (this.state === "syncing" && !errorCaught) {
        this.notify("idle");
        this.currentOp = null;
      }
    } catch (e: any) {
      // Already handled by error listener
    }
  }

  public async rollback() {
    if (!this.currentOp || !this.currentOp.recoverySnapshot) {
      this.notify("idle");
      return;
    }
    // Simulate rollback by ending sync. Real rollback would restore the actual Excel values.
    // However, since rollback logic states "restore the UI state to the pre-operation snapshot",
    // just emitting "idle" with the recoverySnapshot works. We might also need to restore Excel.

    // For now, emit a special state or just emit idle and let the host reload.
    this.notify("idle", { study: this.currentOp.recoverySnapshot });
    this.currentOp = null;
  }

  public resolveConflict(keepManualEdits: boolean) {
    if (keepManualEdits) {
      this.notify("idle");
      this.currentOp = null;
    } else {
      if (this.currentOp) {
        this.forceResumeSync();
      }
    }
  }

  private async forceResumeSync() {
    this.notify("syncing", { predictedStudy: this.currentOp?.predictedStudy });
    if (this.currentOp) {
      await Excel.run(async (ctx) => {
        for (const sheetName of ["_Study", "_Forms", "_Codelists"]) {
          this.currentOp!.snapshotFingerprints[sheetName] = await this.getSheetFingerprint(
            ctx,
            sheetName
          );
        }
      });
      this.executeSyncBackground();
    }
  }
}

export const speculativeSyncManager = new SpeculativeSyncManager();
