/* global Excel */

/**
 * Inserts a standard CDISC-style Date/Time variable block.
 */
export async function insertDateBlock(): Promise<void> {
    await Excel.run(async (context) => {
        const range = context.workbook.getSelectedRange();
        // Variable Name, Label, Type, Required, Min, Max, ShowIf, Codelist
        const data = [
            ["_DAT", "Date of Assessment", "Date", "Yes", "", "", "", ""],
            ["_TIM", "Time of Assessment", "Time", "No", "", "", "", ""]
        ];

        const targetRange = range.getResizedRange(data.length - 1, 7);
        targetRange.values = data;
        targetRange.format.autofitColumns();
        await context.sync();
    });
}

/**
 * Inserts a comprehensive Adverse Event log block.
 */
export async function insertAEBlock(): Promise<void> {
    await Excel.run(async (context) => {
        const range = context.workbook.getSelectedRange();
        const data = [
            ["AETERM", "Adverse Event Term", "Text", "Yes", "", "", "", ""],
            ["AESTDAT", "Start Date", "Date", "Yes", "", "", "", ""],
            ["AEENDAT", "End Date", "Date", "No", "", "", "", ""],
            ["AESEV", "Severity", "Codelist", "Yes", "", "", "", "SEVERITY"],
            ["AESER", "Serious?", "Codelist", "Yes", "", "", "", "YES_NO"],
            ["AEREL", "Relationship to Study Drug", "Codelist", "Yes", "", "", "", "RELATIONSHIP"]
        ];

        const targetRange = range.getResizedRange(data.length - 1, 7);
        targetRange.values = data;
        targetRange.format.autofitColumns();
        await context.sync();
    });
}
