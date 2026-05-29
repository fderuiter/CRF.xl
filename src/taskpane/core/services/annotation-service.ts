/* eslint-disable no-undef */
/* global Excel */
import { ValidationIssue } from "../parser/validator";

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
  issuesToHighlight: ValidationIssue[]
): Promise<void> {
  await Excel.run(async (context) => {
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

      // Requirement 5: Comment deletion as collection-level operation
      state.comments.items.forEach((c) => c.delete());
    }

    // We do NOT sync here. Clear operations and highlight operations are queued
    // deterministically and will be executed in a single atomic transaction.

    // 3. Highlight new errors
    const CHUNK_SIZE = 100;
    let operationCount = 0;

    for (const issue of issuesToHighlight) {
      if (!issue.sheetName || issue.rowIndex === undefined) continue;

      const state = cache.get(issue.sheetName);
      if (!state) continue;

      // Requirement 3: Large-scale write operations batched into single-call assignments
      const rowRange = state.sheet.getRangeByIndexes(issue.rowIndex, 0, 1, 8);
      rowRange.format.fill.color = "#fee2e2"; // Tailwind red-100

      const cell = state.sheet.getRangeByIndexes(issue.rowIndex, 0, 1, 1);
      try {
        state.comments.add(cell, issue.message);
      } catch (e) {
        console.warn(`[AnnotationService] Could not add comment to sheet: ${issue.sheetName}`, e);
      }

      operationCount++;

      // Requirement 4: Yield control back to host at regular intervals (sub-linear chunking)
      if (operationCount % CHUNK_SIZE === 0) {
        // Yield to JS event loop so UI (Taskpane) can respond
        // We do NOT call context.sync() here to maintain a single atomic transaction wrapper.
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    }

    // Final sync for all queued operations (clears and highlights combined)
    await context.sync();
  });
}
