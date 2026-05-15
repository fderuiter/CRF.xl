const path = require("path");
const ExcelJS = require("exceljs");

const TARGET_PATH = path.resolve(__dirname, "mega-study-v1.xlsx");

const COUNTS = {
  forms: 50,
  variablesPerForm: 30,
  codelistEntries: 5000,
  codelists: 50,
  codelistEntriesPerList: 100,
  scheduleRows: 200,
  scheduleVisits: 10,
};

function buildFormOid(index) {
  return `F${String(index).padStart(3, "0")}`;
}

async function generate() {
  const workbook = new ExcelJS.Workbook();

  const study = workbook.addWorksheet("_Study");
  study.addRow(["Protocol ID", "Study Name", "Version", "Default Language"]);
  study.addRow(["MEGA-PERF-001", "Mega Study Performance Fixture", "1.0.0", "en-US"]);

  const forms = workbook.addWorksheet("_Forms");
  forms.addRow(["Form OID", "Form Name", "Repeating", "Page Layout"]);
  for (let form = 1; form <= COUNTS.forms; form += 1) {
    forms.addRow([
      buildFormOid(form),
      `Mega Form ${String(form).padStart(3, "0")}`,
      form % 10 === 0 ? "Yes" : "No",
      form % 2 === 0 ? "Landscape" : "Portrait",
    ]);
  }

  const codelists = workbook.addWorksheet("_Codelists");
  codelists.addRow(["Codelist ID", "Codelist Name", "Coded Value", "Decode"]);
  for (let list = 1; list <= COUNTS.codelists; list += 1) {
    const codelistId = `CL${String(list).padStart(3, "0")}`;
    for (let item = 1; item <= COUNTS.codelistEntriesPerList; item += 1) {
      codelists.addRow([
        codelistId,
        `Mega Codelist ${String(list).padStart(3, "0")}`,
        `CODE_${String(item).padStart(3, "0")}`,
        `Decoded value ${item} for ${codelistId}`,
      ]);
    }
  }

  const schedule = workbook.addWorksheet("_Schedule");
  const visitHeaders = ["Form OID"];
  for (let visit = 1; visit <= COUNTS.scheduleVisits; visit += 1) {
    visitHeaders.push(`Visit ${String(visit).padStart(3, "0")}`);
  }
  schedule.addRow(visitHeaders);
  for (let row = 1; row <= COUNTS.scheduleRows; row += 1) {
    const formIndex = ((row - 1) % COUNTS.forms) + 1;
    const values = [buildFormOid(formIndex)];
    for (let visit = 1; visit <= COUNTS.scheduleVisits; visit += 1) {
      values.push((row + visit) % 3 === 0 ? "X" : "");
    }
    schedule.addRow(values);
  }

  const formHeaders = [
    "Variable Name",
    "Label",
    "Variable Type",
    "Required",
    "Show If",
    "Codelist ID",
    "Length",
    "Precision",
    "Origin",
  ];

  for (let form = 1; form <= COUNTS.forms; form += 1) {
    const formOid = buildFormOid(form);
    const sheet = workbook.addWorksheet(formOid);
    sheet.addRow(formHeaders);

    for (let item = 1; item <= COUNTS.variablesPerForm; item += 1) {
      const variableName = `VAR_${String(form).padStart(3, "0")}_${String(item).padStart(3, "0")}`;
      const isCodelist = item % 5 === 0;
      const type = isCodelist
        ? "Text"
        : item % 4 === 0
          ? "Date"
          : item % 3 === 0
            ? "Float"
            : item % 2 === 0
              ? "Integer"
              : "Text";

      sheet.addRow([
        variableName,
        `Label for ${variableName}`,
        type,
        item % 2 === 0 ? "Yes" : "No",
        item % 7 === 0 ? `VAR_${String(form).padStart(3, "0")}_001 = 'Y'` : "",
        isCodelist ? `CL${String(((form - 1) % COUNTS.codelists) + 1).padStart(3, "0")}` : "",
        type === "Text" ? 120 : 8,
        type === "Float" ? 2 : "",
        item % 10 === 0 ? "Derived" : "Collected",
      ]);
    }
  }

  await workbook.xlsx.writeFile(TARGET_PATH);

  const totalWorkbookRows =
    2 +
    (COUNTS.forms + 1) +
    (COUNTS.codelistEntries + 1) +
    (COUNTS.scheduleRows + 1) +
    COUNTS.forms * (COUNTS.variablesPerForm + 1);

  process.stdout.write(
    JSON.stringify(
      {
        fixture: path.basename(TARGET_PATH),
        ...COUNTS,
        totalVariables: COUNTS.forms * COUNTS.variablesPerForm,
        totalWorkbookRows,
      },
      null,
      2
    ) + "\n"
  );
}

generate().catch((error) => {
  process.stderr.write(`${String(error)}\n`);
  process.exitCode = 1;
});
