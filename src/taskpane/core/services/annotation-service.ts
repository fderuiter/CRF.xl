/**
 * @issue #84
 */
/* eslint-disable no-undef */
/* global Excel */
import { ValidationIssue } from "../parser/validator";
import { ParseRuntime, createParseRuntime, processRowsInChunks } from "../parser/chunking-runtime";

/**
 * Count comment annotations that appear orphaned on the given worksheets.
 *
 * An annotation is considered orphaned when its row cannot be mapped to a valid object identifier (OID) in the sheet's used range. Comments tagged with "[Validation]" and sheets whose names start with "_" are excluded from the check.
 *
 * @param sheetNames - Names of worksheets to inspect for orphaned annotations
 * @returns The number of comments considered orphaned. A comment is counted when the sheet's used range is missing or inaccessible, the comment's row lies outside the used range, or the first-column cell at the comment's row is empty or equals "variable name" (case-insensitive)
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
        if (c.content && /^\[Validation\]/.test(c.content)) {
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
 * Apply validation highlights and add validation comments across specified worksheets within a single transactional batch.
 *
 * Clears only system-generated validation comments and existing validation fill on the provided sheets, then highlights rows and adds `[Validation]`-prefixed comments for the supplied issues. All workbook mutations are queued and committed together to preserve an atomic update while periodically yielding to the event loop to keep the UI responsive.
 *
 * @param sheetNamesToClear - Names of worksheets whose previous validation fills and `[Validation]` comments should be removed.
 * @param issuesToHighlight - Array of validation issues to highlight; each issue should include a sheet name and a row index or an OID to resolve the target row.
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
        usedRange.load(["rowCount", "columnCount", "isNullObject", "values"]);
        sheet.comments.load("items/content");
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

      // Requirement 3: Only collect system-generated [Validation] comments for deletion, preserving manual user comments.
      state.comments.items
        .filter((c) => c.content && /^\[Validation\]/.test(c.content))
        .forEach((c) => allComments.push(c));
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
        if (!issue.sheetName || issue.rowIndex === undefined) return;
        const state = cache.get(issue.sheetName);
        if (!state) return;

        // Requirement 4: Coordinate mapping must account for the 1-based vs 0-based index discrepancy
        let targetRowIndex = issue.rowIndex - 1;

        // Requirement 2: Visual coordinates for annotations must be resolved dynamically at runtime by searching for the OID's current row location
        if (issue.oid && !state.usedRange.isNullObject && state.usedRange.values) {
          for (let r = 0; r < state.usedRange.values.length; r++) {
            const rowValues = state.usedRange.values[r];
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
          return; // Skip if row is out of bounds
        }

        const rowRange = state.sheet.getRangeByIndexes(targetRowIndex, 0, 1, 8);
        rowRange.format.fill.color = "#fee2e2"; // Tailwind red-100

        const cell = state.sheet.getRangeByIndexes(targetRowIndex, 0, 1, 1);
        try {
          state.comments.add(cell, `[Validation] ${issue.message}`);
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
