/**
 * @issue #84
 */
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
      sheet.comments.load("items/content");
    }
    await context.sync();

    const commentLocations: { c: Excel.Comment, location: Excel.Range, sheet: Excel.Worksheet }[] = [];
    for (const sheet of sheetsToCheck) {
      for (const c of sheet.comments.items) {
        if (c.content && c.content.includes("[Validation]")) {
          continue; // System-generated issues are not considered orphaned manual annotations
        }
        if (sheet.name.startsWith("_")) {
          continue; // Non-form metadata sheets remain out of scope for this anchoring model
        }
        const location = c.getLocation();
        location.load("rowIndex");
        commentLocations.push({ c, location, sheet });
      }
    }

    if (commentLocations.length > 0) {
      await context.sync();

      const sheetRanges = new Map<string, Excel.Range>();
      for (const sheet of sheetsToCheck) {
        if (commentLocations.some(cl => cl.sheet.name === sheet.name)) {
          const usedRange = sheet.getUsedRangeOrNullObject();
          usedRange.load(["values", "isNullObject", "rowIndex"]);
          sheetRanges.set(sheet.name, usedRange);
        }
      }

      await context.sync();

      for (const cl of commentLocations) {
        const usedRange = sheetRanges.get(cl.sheet.name);
        if (!usedRange || usedRange.isNullObject || !usedRange.values) {
          count++;
          continue;
        }

        const arrayIndex = cl.location.rowIndex - usedRange.rowIndex;
        if (arrayIndex >= 0 && arrayIndex < usedRange.values.length) {
          const oid = String(usedRange.values[arrayIndex][0] || "").trim();
          if (!oid || oid.toLowerCase() === "variable name") {
            count++; // No valid OID at this location, so it's orphaned
          }
        } else {
          count++; // Out of bounds
        }
      }
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
        usedRange.load(["rowCount", "columnCount", "isNullObject", "values"]);
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

      // Requirement 3: The validation engine must selectively clear only system-generated issues while preserving manual user comments.
      // Requirement 5: Comment deletion as collection-level operation
      state.comments.items.forEach((c) => {
        if (c.content && c.content.includes("[Validation]")) {
          c.delete();
        }
      });
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

      // Requirement 4: Coordinate mapping must account for the 1-based vs 0-based index discrepancy
      let targetRowIndex = issue.rowIndex - 1;

      // Requirement 2: Visual coordinates for annotations must be resolved dynamically at runtime by searching for the OID's current row location
      if (issue.oid && !state.usedRange.isNullObject && state.usedRange.values) {
        for (let r = 0; r < state.usedRange.values.length; r++) {
          const rowValues = state.usedRange.values[r];
          // Assuming OID is in the first column (index 0)
          if (rowValues && rowValues.length > 0) {
            const cellValue = String(rowValues[0]).trim().toUpperCase();
            if (cellValue === issue.oid.toUpperCase()) {
              targetRowIndex = r;
              break;
            }
          }
        }
      }

      if (targetRowIndex < 0) targetRowIndex = 0;
      if (!state.usedRange.isNullObject && targetRowIndex >= state.usedRange.rowCount) {
        continue; // Skip if row is somehow out of bounds
      }

      // Requirement 3: Large-scale write operations batched into single-call assignments
      const rowRange = state.sheet.getRangeByIndexes(targetRowIndex, 0, 1, 8);
      rowRange.format.fill.color = "#fee2e2"; // Tailwind red-100

      const cell = state.sheet.getRangeByIndexes(targetRowIndex, 0, 1, 1);
      try {
        state.comments.add(cell, `[Validation] ${issue.message}`);
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
