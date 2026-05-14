/**
 * ============================================================================
 * template-generator.ts
 * ============================================================================
 * Utility to scaffold a blank, formatted Excel workbook with the 
 * specific headers required by the CRF.xl Parser.
 * Refined to automatically populate metadata from the user environment.
 */

/* global Office, Excel */

export async function initializeWorkbook(): Promise<void> {
    return await Excel.run(async (context) => {
        const sheets = context.workbook.worksheets;
        
        // 1. Detect Environment Data
        // Use Office.context to get the user's display language
        const envLanguage = Office.context.displayLanguage || "en-US";
        
        // Attempt to infer a Protocol ID from the document name
        const docUrl = Office.context.document.url;
        const fileName = docUrl ? docUrl.split('/').pop()?.split('.')[0] : "PROT-XXXX";

        const sheetConfigs = [
            { 
                name: "Metadata", 
                headers: ["Protocol ID", "Study Name", "Version", "Default Language"],
                data: [[fileName, "New Clinical Study", "1.0.0", envLanguage]]
            },
            { 
                name: "Events", 
                headers: ["Event ID", "Event Name", "Sequence", "Show If", "Forms"],
                data: [["VISIT_1", "Screening", "1", "", "SCREENING_FORM"]] 
            },
            { 
                name: "Forms", 
                headers: ["Form ID", "Form Name", "Sequence", "Repeating", "Show If"],
                data: [["SCREENING_FORM", "Screening & Eligibility", "1", "No", ""]] 
            },
            { 
                name: "Items", 
                headers: ["Form", "Page", "Variable Name", "Label", "Variable Type", "Sequence", "SAS Label", "Required Field", "Minimum Value", "Maximum Value", "Show If", "Derivation", "Dependencies", "Required If", "Validation Script"],
                data: [["SCREENING_FORM", "Demographics", "BRTHDT", "Date of Birth", "Date", "1", "BRTHDT", "Yes", "", "", "", "", "", "", ""]]
            },
            { 
                name: "Codelists", 
                headers: ["Codelist ID", "Codelist Name", "Coded Value", "Decode", "Sequence"],
                data: [["GENDER", "Gender", "M", "Male", "1"], ["GENDER", "Gender", "F", "Female", "2"]] 
            }
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
            
            // 3. Populate Initial Environmental Data
            if (config.data) {
                const dataRange = sheet.getRangeByIndexes(1, 0, config.data.length, config.headers.length);
                dataRange.values = config.data;
            }

            headerRange.format.autofitColumns();
            sheet.freezePanes.freezeRows(1);
        }

        // Activate the Metadata sheet to start
        sheets.getItem("Metadata").activate();
        await context.sync();
    });
}
