/// <reference types="office-js" />
import { logger } from "../utils/logger";
/* global Excel */
/**
 * @issue #28
 */

import { SubscriptionManager } from "../utils/event-utility";
import { sha256Native } from "../utils/crypto-utils";
import { StudyDesign } from "../types";
import { classifyOfficeError } from "./office-error-handling";
import { parseExcelToStudyDesign } from "../parser/excel-parser";
import { diffStudyDesigns } from "./diff-engine";
import { WorkbookProjection } from "./migration-pipeline";
import { parseRawDataToStudyDesign } from "../parser/parser-engine";
import { ChunkingEngine, ExecutionPlan } from "../engine/chunking-engine";
import { createRetryMiddleware } from "../engine/middlewares";

interface SpeculativeSyncOperation {
  id: string;
  plans: ExecutionPlan<string[]>[];
  predictedStudy: StudyDesign;
  snapshotFingerprints: Record<string, string>;
  recoverySnapshot: StudyDesign | null; // For rollback
  baselineProjection: WorkbookProjection;
}

export type SyncState = "idle" | "syncing" | "conflict" | "error";

interface SyncStatePayload {
  state: SyncState;
  details?: any;
}

export async function getPredictedStudyDesign(
  projection: WorkbookProjection
): Promise<StudyDesign> {
  const rawData: Record<string, unknown[][]> = {
    _Study: projection.studyRows ?? [],
    _Forms: projection.formsRows ?? [],
    _Codelists: projection.codelistRows ?? [],
  };
  return await parseRawDataToStudyDesign(rawData);
}

class SpeculativeSyncManager {
  private state: SyncState = "idle";
  private currentDetails?: any;
  private currentOp: SpeculativeSyncOperation | null = null;
  private subscriptionManager = new SubscriptionManager<SyncStatePayload>(() => ({
    state: this.state,
    details: this.currentDetails,
  }));

  public subscribe(listener: (payload: SyncStatePayload) => void) {
    return this.subscriptionManager.subscribe(listener, { immediate: true });
  }

  public initialize() {
    if (typeof Excel !== "undefined") {
      this.unlockSheets().catch(err => logger.error("Failed to unlock sheets on initialization", err));
    }
  }

  private async unlockSheets() {
    if (typeof Excel === "undefined") return;
    await Excel.run(async (context) => {
      for (const sheetName of ["_Study", "_Forms", "_Codelists"]) {
        const sheet = context.workbook.worksheets.getItemOrNullObject(sheetName);
        sheet.load("isNullObject, protection/protected");
        await context.sync();
        if (!sheet.isNullObject && sheet.protection.protected) {
          sheet.protection.unprotect();
        }
      }
      await context.sync();
    });
  }

  private notify(state: SyncState, details?: any) {
    const previousState = this.state;
    this.state = state;
    this.currentDetails = details;
    this.subscriptionManager.notify({ state, details });

    if (previousState === "syncing" && state !== "syncing") {
      this.unlockSheets().catch(err => logger.error("Failed to unlock sheets on state transition", err));
    }
  }

  public getState() {
    return this.state;
  }

  public async getSheetFingerprint(
    context: Excel.RequestContext,
    sheetName: string
  ): Promise<string> {
    const sheet = context.workbook.worksheets.getItemOrNullObject(sheetName);
    sheet.load("isNullObject");
    await context.sync();
    if (sheet.isNullObject) return "missing";
    const range = sheet.getUsedRangeOrNullObject();
    range.load("isNullObject");
    await context.sync();
    if (range.isNullObject) return "empty";
    range.load("values");
    await context.sync();
    return await sha256Native(JSON.stringify(range.values));
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
    await Excel.run(async (context) => {
      for (const sheetName of ["_Study", "_Forms", "_Codelists"]) {
        const sheet = context.workbook.worksheets.getItemOrNullObject(sheetName);
        sheet.load("isNullObject, protection/protected");
        await context.sync();
        if (!sheet.isNullObject && !sheet.protection.protected) {
          sheet.protection.protect({ selectionMode: "Unlocked" });
        }
      }

      snapshotFingerprints["_Study"] = await this.getSheetFingerprint(context, "_Study");
      snapshotFingerprints["_Forms"] = await this.getSheetFingerprint(context, "_Forms");
      snapshotFingerprints["_Codelists"] = await this.getSheetFingerprint(context, "_Codelists");
    });

    this.currentOp = {
      id: Date.now().toString(),
      plans,
      predictedStudy,
      snapshotFingerprints,
      recoverySnapshot: baselineStudy,
      baselineProjection: projection,
    };

    this.notify("syncing", { predictedStudy });

    // Start background sync
    this.executeSyncBackground();
  }

  private async executeSyncBackground() {
    if (!this.currentOp) return;
    const { predictedStudy, recoverySnapshot, plans } = this.currentOp;

    const engine = new ChunkingEngine<string[]>({
      chunkSize: 500,
    });

    // Fingerprint middleware
    engine.use(async (ctx, _chunk, next) => {
      const sheetName = ctx.id;
      if (this.state !== "syncing") {
        throw new Error("CANCELLED");
      }

      await Excel.run(async (context) => {
        const currentFp = await this.getSheetFingerprint(context, sheetName);
        if (currentFp !== this.currentOp!.snapshotFingerprints[sheetName]) {
          throw new Error("FINGERPRINT_MISMATCH");
        }
      });

      await next();

      if (this.state !== "syncing") {
        throw new Error("CANCELLED");
      }

      await Excel.run(async (context) => {
        this.currentOp!.snapshotFingerprints[sheetName] = await this.getSheetFingerprint(
          context,
          sheetName
        );
      });
    });

    // Retry middleware
    engine.use(
      createRetryMiddleware({
        maxRetries: 15,
        delayMs: 2000,
        shouldRetry: (error) => {
          if (error.message === "FINGERPRINT_MISMATCH" || error.message === "CANCELLED")
            return false;
          const errClass = classifyOfficeError(error);
          return errClass === "excelBusy";
        },
      })
    );

    // Progress listener 1: State management
    engine.on("progress", (_data: any) => {
      // For potential UI progress bar binding
    });

    // Progress listener 2: Telemetry/Diagnostics
    engine.on("progress", (data: any) => {
      logger.info(
        `[Telemetry] Speculative Sync Progress: ${data.completed}/${data.total} for plan ${data.planId}`
      );
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
        } catch {
          this.notify("conflict", { diff: null, recoverySnapshot });
        }
        return;
      }
      this.notify("error", { error });
    });

    try {
      await engine.execute(plans, async (chunk, ctx) => {
        await Excel.run(async (context) => {
          const sheet = context.workbook.worksheets.getItemOrNullObject(ctx.id);
          sheet.load("isNullObject, protection/protected");
          await context.sync();
          
          let wasProtected = false;
          const target = sheet.isNullObject ? context.workbook.worksheets.add(ctx.id) : sheet;

          if (!sheet.isNullObject && sheet.protection.protected) {
            wasProtected = true;
            sheet.protection.unprotect();
            await context.sync();
          }

          if (ctx.isFirstChunk && !sheet.isNullObject) {
            target.getUsedRangeOrNullObject().delete(Excel.DeleteShiftDirection.up);
            await context.sync();
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
          
          if (wasProtected) {
            target.protection.protect({ selectionMode: "Unlocked" });
          }
          await context.sync();
        });
      });

      if (this.state === "syncing" && !errorCaught) {
        this.notify("idle");
        this.currentOp = null;
      }
    } catch {
      // Already handled by error listener
    }
  }

  public async rollback() {
    if (!this.currentOp || !this.currentOp.baselineProjection) {
      this.notify("idle");
      return;
    }

    const projection = this.currentOp.baselineProjection;
    const plans: ExecutionPlan<string[]>[] = [
      { id: "_Study", data: (projection.studyRows as string[][]) || [] },
      { id: "_Forms", data: (projection.formsRows as string[][]) || [] },
      { id: "_Codelists", data: (projection.codelistRows as string[][]) || [] },
    ];

    const engine = new ChunkingEngine<string[]>({ chunkSize: 500 });
    
    try {
      await engine.execute(plans, async (chunk, ctx) => {
        await Excel.run(async (context) => {
          const sheet = context.workbook.worksheets.getItemOrNullObject(ctx.id);
          sheet.load("isNullObject, protection/protected");
          await context.sync();
          
          if (sheet.isNullObject) return;
          
          let wasProtected = false;
          if (sheet.protection.protected) {
            wasProtected = true;
            sheet.protection.unprotect();
            await context.sync();
          }

          if (ctx.isFirstChunk) {
            sheet.getUsedRangeOrNullObject().delete(Excel.DeleteShiftDirection.up);
            await context.sync();
          }

          if (chunk.length > 0) {
            const range = sheet.getRangeByIndexes(
              ctx.startIndex,
              0,
              chunk.length,
              chunk[0].length
            );
            range.values = chunk;
          }
          
          if (wasProtected) {
             sheet.protection.protect({ selectionMode: "Unlocked" });
          }
          await context.sync();
        });
      });
    } catch (err) {
      logger.error("Rollback failed to restore physical cells", err);
    }

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
      await Excel.run(async (context) => {
        for (const sheetName of ["_Study", "_Forms", "_Codelists"]) {
          this.currentOp!.snapshotFingerprints[sheetName] = await this.getSheetFingerprint(
            context,
            sheetName
          );
        }
      });
      this.executeSyncBackground();
    }
  }
}

export const speculativeSyncManager = new SpeculativeSyncManager();
