/* global Excel */
import { ValidationIssue } from '../parser/validator';

/**
 * High-performance canvas cleaner. 
 * Surgically wipes red highlights and cell comments from active study sheets without harming data or headers.
 */
export async function clearAllAnnotations(sheetNames: string[]): Promise<void> {
    await Excel.run(async (context) => {
        for (const name of sheetNames) {
            const sheet = context.workbook.worksheets.getItemOrNullObject(name);
            await context.sync();
            if (sheet.isNullObject) continue;

            const range = sheet.getUsedRangeOrNullObject();
            await context.sync();
            
            // If the sheet is empty or only has a header, skip it
            if (range.isNullObject || range.rowCount <= 1) continue;

            // Target everything below the header (Row 1 to End)
            const dataRange = sheet.getRangeByIndexes(1, 0, range.rowCount - 1, range.columnCount);
            
            // 1. Clear background color (removes the red error highlight)
            dataRange.format.fill.clear();

            // 2. Clear Excel comments safely using the official Office.js Comments API
            try {
                const comments = sheet.comments;
                comments.load("items");
                await context.sync();
                
                // Iterate through and delete all comments on this sheet
                comments.items.forEach(comment => {
                    comment.delete();
                });
            } catch (e) {
                console.warn(`[AnnotationService] Could not clear comments on sheet: ${name}`, e);
            }
        }
        await context.sync();
    });
}

/**
 * Paints errors directly onto the Excel grid as red rows and threaded comments.
 */
export async function highlightErrorsOnCanvas(issues: ValidationIssue[]): Promise<void> {
    await Excel.run(async (context) => {
        for (const issue of issues) {
            if (!issue.sheetName || issue.rowIndex === undefined) continue;

            const sheet = context.workbook.worksheets.getItemOrNullObject(issue.sheetName);
            await context.sync();
            if (sheet.isNullObject) continue;

            // Highlight the entire row (Assumes standard CRF width of 8 columns)
            const range = sheet.getRangeByIndexes(issue.rowIndex, 0, 1, 8);
            range.format.fill.color = "#fee2e2"; // Tailwind red-100
            
            // Attach the exact error message to the Variable Name cell as a Comment
            const cell = sheet.getRangeByIndexes(issue.rowIndex, 0, 1, 1);
            
            try {
                sheet.comments.add(cell, issue.message);
            } catch (e) {
                console.warn(`[AnnotationService] Could not add comment to sheet: ${issue.sheetName}`, e);
            }
        }
        await context.sync();
    });
}
