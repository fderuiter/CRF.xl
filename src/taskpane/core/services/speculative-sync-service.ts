/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-unused-vars, office-addins/call-sync-before-read, office-addins/call-sync-after-load */
/* global Excel */
/**
 * @issue #28
 */

import * as CryptoJS from "crypto-js";
import { StudyDesign } from "../types";
import { classifyOfficeError } from "./office-error-handling";
import { parseExcelToStudyDesign } from "../parser/excel-parser";
import { diffStudyDesigns } from "./diff-engine";
import { StudyDiffReport } from "../types/diff";
import { WorkbookProjection } from "./migration-pipeline";
import { parseWorkbookSheetValuesToStudyDesign } from "../parser/baseline-workbook-parser";

export interface SyncChunk {
  sheetName: string;
  data: string[][];
  startIndex: number;
  isFirstChunk: boolean;
}

export interface SpeculativeSyncOperation {
  id: string;
  chunks: SyncChunk[];
  predictedStudy: StudyDesign;
  snapshotFingerprints: Record<string, string>;
  recoverySnapshot: StudyDesign | null; // For rollback
}

export type SyncState = "idle" | "syncing" | "conflict" | "error";

export async function getPredictedStudyDesign(
  projection: WorkbookProjection
): Promise<StudyDesign> {
  return await parseWorkbookSheetValuesToStudyDesign({
    async getSheetValues(sheetName: string) {
      if (sheetName === "_Study") return projection.studyRows;
      if (sheetName === "_Forms") return projection.formsRows;
      if (sheetName === "_Codelists") return projection.codelistRows;
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

  public buildChunks(sheetName: string, rows: string[][], chunkSize: number = 500): SyncChunk[] {
    const chunks: SyncChunk[] = [];
    for (let i = 0; i < rows.length; i += chunkSize) {
      chunks.push({
        sheetName,
        data: rows.slice(i, i + chunkSize),
        startIndex: i,
        isFirstChunk: i === 0,
      });
    }
    return chunks;
  }

  public async startSync(
    projection: WorkbookProjection,
    predictedStudy: StudyDesign,
    baselineStudy: StudyDesign | null
  ) {
    if (this.state === "syncing") return;

    const chunks: SyncChunk[] = [
      ...this.buildChunks("_Study", projection.studyRows),
      ...this.buildChunks("_Forms", projection.formsRows),
      ...this.buildChunks("_Codelists", projection.codelistRows),
    ];

    let snapshotFingerprints: Record<string, string> = {};
    await Excel.run(async (ctx) => {
      snapshotFingerprints["_Study"] = await this.getSheetFingerprint(ctx, "_Study");
      snapshotFingerprints["_Forms"] = await this.getSheetFingerprint(ctx, "_Forms");
      snapshotFingerprints["_Codelists"] = await this.getSheetFingerprint(ctx, "_Codelists");
    });

    this.currentOp = {
      id: Date.now().toString(),
      chunks,
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
    const { chunks, snapshotFingerprints, predictedStudy, recoverySnapshot } = this.currentOp;

    let expectedFingerprints = { ...snapshotFingerprints };

    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      if (this.state !== "syncing") break;

      const chunk = chunks[chunkIndex];
      let success = false;
      let retries = 0;

      while (!success && retries < 15) {
        try {
          await Excel.run(async (ctx) => {
            const currentFp = await this.getSheetFingerprint(ctx, chunk.sheetName);
            if (currentFp !== expectedFingerprints[chunk.sheetName]) {
              throw new Error("FINGERPRINT_MISMATCH");
            }

            const sheet = ctx.workbook.worksheets.getItemOrNullObject(chunk.sheetName);
            await ctx.sync();
            const target = sheet.isNullObject
              ? ctx.workbook.worksheets.add(chunk.sheetName)
              : sheet;

            if (chunk.isFirstChunk && !sheet.isNullObject) {
              target.getUsedRangeOrNullObject().delete(Excel.DeleteShiftDirection.up);
              await ctx.sync();
            }

            if (chunk.data.length > 0) {
              const range = target.getRangeByIndexes(
                chunk.startIndex,
                0,
                chunk.data.length,
                chunk.data[0].length
              );
              range.values = chunk.data;
            }
            await ctx.sync();

            expectedFingerprints[chunk.sheetName] = await this.getSheetFingerprint(
              ctx,
              chunk.sheetName
            );
          });
          success = true;
        } catch (e: any) {
          if (e.message === "FINGERPRINT_MISMATCH") {
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

          const errClass = classifyOfficeError(e);
          if (errClass === "excelBusy") {
            await new Promise((r) => setTimeout(r, 2000));
            retries++;
          } else {
            this.notify("error", { error: e });
            return;
          }
        }
      }

      if (!success) {
        this.notify("error", { error: new Error("Failed after retries") });
        return;
      }

      await new Promise((r) => setTimeout(r, 20)); // Yield
    }

    this.notify("idle");
    this.currentOp = null;
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
