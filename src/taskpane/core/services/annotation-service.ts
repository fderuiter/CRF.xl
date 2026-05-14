/* global Excel */
import { ValidationIssue } from '../parser/validator';

/**
 * High-performance canvas cleaner.
 * Wipes all red highlights and comments from the active study sheets.
 */
export async function clearAllAnnotations(sheetNames: string[]): Promise<void> {
    await Excel.run(async (context) => {
        for (const name of sheetNames) {
            const sheet = context.workbook.worksheets.getItemOrNullObject(name);
            await context.sync();
            if (sheet.isNullObject) continue;

            const range = sheet.getUsedRangeOrNullObject();
            await context.sync();
            if (range.isNullObject) continue;

            // Clear fill color
            range.format.fill.clear();
            // Remove all comments in the range

            // We actually just want to remove comments
            const comments = sheet.comments;
            comments.load("items");
            await context.sync();
            comments.items.forEach(c => c.delete());
        }
        await context.sync();
    });
}

/**
 * Paints errors directly onto the Excel grid.
 */
export async function highlightErrorsOnCanvas(issues: ValidationIssue[]): Promise<void> {
    await Excel.run(async (context) => {
        for (const issue of issues) {
            if (!issue.sheetName || issue.rowIndex === undefined) continue;

            const sheet = context.workbook.worksheets.getItem(issue.sheetName);
            // Highlight the entire row (Variable Name to Codelist ID)
            const range = sheet.getRangeByIndexes(issue.rowIndex, 0, 1, 8);

            range.format.fill.color = "#fee2e2"; // Tailwind red-100

            // Add a note/comment to the specific cell (usually Variable Name in Col 0)
            const cell = sheet.getRangeByIndexes(issue.rowIndex, 0, 1, 1);
            sheet.comments.add(cell, issue.message);
        }
        await context.sync();
    });
}