/* global Excel */

export const insertDateBlock = async () => {
  try {
    await Excel.run(async (context) => {
      const sheet = context.workbook.worksheets.getActiveWorksheet();

      const range = context.workbook.getSelectedRange();
      range.load("rowIndex, columnIndex");
      await context.sync();

      const startRow = range.rowIndex;

      // Let's do a simple standard insert: Variable Name, Label, Variable Type
      const standardData = [["ASSESSDAT", "Date of Assessment", "date", "yes", "", ""]];

      const targetRange = sheet.getRangeByIndexes(
        startRow,
        0,
        standardData.length,
        standardData[0].length
      );
      targetRange.values = standardData;

      await context.sync();
    });
  } catch (error) {
    console.error(error);
  }
};

export const insertAEBlock = async () => {
  try {
    await Excel.run(async (context) => {
      const sheet = context.workbook.worksheets.getActiveWorksheet();
      const range = context.workbook.getSelectedRange();
      range.load("rowIndex, columnIndex");
      await context.sync();

      const startRow = range.rowIndex;
      const data = [
        ["AETERM", "Adverse Event Term", "text", "yes", "", ""],
        ["AESTDAT", "Start Date", "date", "yes", "", ""],
        ["AEENDAT", "End Date", "date", "no", "", ""],
        ["AESEV", "Severity", "text", "yes", "", "CL_SEV"],
      ];

      const targetRange = sheet.getRangeByIndexes(startRow, 0, data.length, data[0].length);
      targetRange.values = data;

      await context.sync();
    });
  } catch (error) {
    console.error(error);
  }
};
