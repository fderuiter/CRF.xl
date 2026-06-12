/**
 * @issue #84
 */
/* eslint-disable no-undef */
/* global Excel */
import { ValidationIssue } from "../parser/validator";
import { ParseRuntime, createParseRuntime, processRowsInChunks } from "../parser/chunking-runtime";

/**
 * Checks for orphaned annotations (comments) across the active sheets.
 */
export async function getOrphanedAnnotationsCount(sheetNames: string[]): Promise<number> {
  let count = 0;
  await Excel.run(async (context) => {
    // Requirement 2: Centralized state-loading
    context.workbook.worksheets.load("items/name");
    await context.sync();

    const sheetsToCheck = context.workbook.worksheets.items.filter((s) =>
      sheetNames.includes(s.name)
    );
    for (const sheet of sheetsToCheck) {
      sheet.comments.load("items");
    }
    await context.sync();

    for (const sheet of sheetsToCheck) {
      count += sheet.comments.items.length;
    }
  });
  return count;
}

/**
 * Transactional Performance Engine
 * Consolidates clear and highlight operations into a single logical transaction wrapper.
 * Requirement 1: Unified transactional scope.
 * Requirement 2: Local cache instead of iterative host requests.
 * Requirement 3: Batched assignments.
 * Requirement 4: Automatic yielding.
 * Requirement 5: Collection-level deletion.
 */
export async function applyValidationVisuals(
  sheetNamesToClear: string[],
  issuesToHighlight: ValidationIssue[],
  runtime?: ParseRuntime
): Promise<void> {
  await Excel.run(async (context) => {
    const rt = runtime ?? createParseRuntime({ chunkSize: 100 });
    const originalYield = rt.yieldToHost;
    
    // Weaving context.sync() into the chunking lifecycle to prevent memory overflows
    rt.yieldToHost = async () => {
      await context.sync();
      await originalYield();
    };

    // 1. Centralized state-loading phase
    context.workbook.worksheets.load("items/name");
    await context.sync();

    const allSheetNames = new Set([
      ...sheetNamesToClear,
      ...issuesToHighlight.filter((i) => i.sheetName).map((i) => i.sheetName!),
    ]);

    const cache = new Map<
      string,
      {
        sheet: Excel.Worksheet;
        usedRange: Excel.Range;
        comments: Excel.CommentCollection;
      }
    >();

    for (const name of Array.from(allSheetNames)) {
      const sheet = context.workbook.worksheets.items.find((s) => s.name === name);
      if (sheet) {
        const usedRange = sheet.getUsedRangeOrNullObject();
        usedRange.load(["rowCount", "columnCount", "isNullObject"]);
        sheet.comments.load("items");
        cache.set(name, { sheet, usedRange, comments: sheet.comments });
      }
    }

    // Single sync to load all used ranges and comments
    await context.sync();

    // 2. Clear previous annotations
    const allComments: Excel.Comment[] = [];
    
    for (const name of sheetNamesToClear) {
      const state = cache.get(name);
      if (!state) continue;

      if (!state.usedRange.isNullObject && state.usedRange.rowCount > 1) {
        const dataRange = state.sheet.getRangeByIndexes(
          1,
          0,
          state.usedRange.rowCount - 1,
          state.usedRange.columnCount
        );
        dataRange.format.fill.clear();
      }

      allComments.push(...state.comments.items);
    }

    if (allComments.length > 0) {
      rt.reportProgress({
        phase: "items",
        completed: 0,
        total: allComments.length,
        message: "Clearing previous comments"
      });
      await processRowsInChunks(allComments, rt, "items", (c, index) => {
        c.delete();
        rt.reportProgress({
          phase: "items",
          completed: index + 1,
          total: allComments.length,
          message: "Clearing previous comments"
        });
      });
    }

    // 3. Highlight new errors
    if (issuesToHighlight.length > 0) {
      rt.reportProgress({
        phase: "items",
        completed: 0,
        total: issuesToHighlight.length,
        message: "Highlighting validation errors"
      });
      await processRowsInChunks(issuesToHighlight, rt, "items", (issue, index) => {
        if (!issue.sheetName || issue.sourceRowIndex === undefined) return;
        const state = cache.get(issue.sheetName);
        if (!state) return;

        const rowRange = state.sheet.getRangeByIndexes(issue.sourceRowIndex, 0, 1, 8);
        rowRange.format.fill.color = "#fee2e2"; // Tailwind red-100

        const cell = state.sheet.getRangeByIndexes(issue.sourceRowIndex, 0, 1, 1);
        try {
          state.comments.add(cell, issue.message);
        } catch (e) {
          console.warn(`[AnnotationService] Could not add comment to sheet: ${issue.sheetName}`, e);
        }

        rt.reportProgress({
          phase: "items",
          completed: index + 1,
          total: issuesToHighlight.length,
          message: "Highlighting validation errors"
        });
      });
    }

    // Final sync for any remaining queued operations
    await context.sync();
  });
}
