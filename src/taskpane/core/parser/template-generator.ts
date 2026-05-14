/* global Office, Excel */

/**
 * Scaffolds the workbook with clinical metadata sheets.
 */
export async function initializeWorkbook(): Promise<void> {
    return await Excel.run(async (context) => {
        const sheets = context.workbook.worksheets;
        const envLanguage = Office.context.displayLanguage || "en-US";

        const sheetConfigs = [
            { name: "Metadata", headers: ["Protocol ID", "Study Name", "Version", "Default Language"] },
            { name: "Events", headers: ["Event ID", "Event Name", "Sequence", "Show If", "Forms"] },
            { name: "Forms", headers: ["Form ID", "Form Name", "Sequence", "Repeating", "Show If"] },
            { name: "Items", headers: ["Form", "Page", "Variable Name", "Label", "Variable Type", "Sequence", "SAS Label", "Required Field", "Minimum Value", "Maximum Value", "Show If", "Derivation", "Dependencies", "Required If", "Validation Script", "Catalog"] },
            { name: "Codelists", headers: ["Codelist ID", "Codelist Name", "Coded Value", "Decode", "Sequence"] }
        ];

        for (const config of sheetConfigs) {
            let sheet = sheets.getItemOrNullObject(config.name);
            await context.sync();

            if (sheet.isNullObject) {
                sheet = sheets.add(config.name);
            } else {
                sheet.getUsedRange().clear();
            }

            const headerRange = sheet.getRangeByIndexes(0, 0, 1, config.headers.length);
            headerRange.values = [config.headers];
            headerRange.format.fill.color = "#1e3a8a";
            headerRange.format.font.color = "white";
            headerRange.format.font.bold = true;
            headerRange.format.autofitColumns();
            sheet.freezePanes.freezeRows(1);
        }
        await context.sync();
    });
}

/**
 * Meticulous Plumbing: Jump focus to a specific cell.
 * This function was missing from the previous build, causing navigation to fail.
 */
export async function navigateToSource(sheetName: string, rowIndex: number): Promise<void> {
    return await Excel.run(async (context) => {
        const sheet = context.workbook.worksheets.getItem(sheetName);
        sheet.activate();
        // Offset by 1 because data rows start after header
        sheet.getRangeByIndexes(rowIndex, 0, 1, 1).select();
        await context.sync();
    });
}
