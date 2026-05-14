/**
 * ============================================================================
 * template-generator.ts
 * ============================================================================
 * Utility to scaffold a blank, formatted Excel workbook with the 
 * specific headers required by the CRF.xl Parser.
 */

export async function initializeWorkbook(): Promise<void> {
    return await Excel.run(async (context) => {
        const sheets = context.workbook.worksheets;

        // 1. Create Sheets (or get existing)
        const sheetConfigs = [
            { name: "Metadata", headers: ["Protocol ID", "Study Name", "Version", "Default Language"] },
            { name: "Events", headers: ["Event ID", "Event Name", "Sequence", "Show If", "Forms"] },
            { name: "Forms", headers: ["Form ID", "Form Name", "Sequence", "Repeating", "Show If"] },
            { name: "Items", headers: ["Form", "Page", "Variable Name", "Label", "Variable Type", "Sequence", "SAS Label", "Required Field", "Minimum Value", "Maximum Value", "Show If", "Derivation", "Dependencies", "Required If", "Validation Script"] },
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

            // 2. Add and Format Headers
            const headerRange = sheet.getRangeByIndexes(0, 0, 1, config.headers.length);
            headerRange.values = [config.headers];
            
            headerRange.format.fill.color = "#1e3a8a"; // Blue 900
            headerRange.format.font.color = "white";
            headerRange.format.font.bold = true;
            headerRange.format.autofitColumns();
            
            // Freeze the top row for better usability
            sheet.freezePanes.freezeRows(1);
        }

        // Activate the first sheet
        sheets.getItem("Metadata").activate();
        await context.sync();
    });
}
