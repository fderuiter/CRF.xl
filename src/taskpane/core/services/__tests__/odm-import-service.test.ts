/**
 * @issue #28
 */
/** @jest-environment node */
import ExcelJS from "exceljs";
import { generateOdmXml } from "../../generators/cdisc/odm-builder";
import { EventType, DataType, StudyDesign } from "../../types";
import { applyOdmImportToWorkbook, importOdmXml } from "../odm-import-service";

function worksheetRows(worksheet: ExcelJS.Worksheet): unknown[][] {
  return worksheet
    .getSheetValues()
    .slice(1)
    .map((row) => {
      if (Array.isArray(row)) {
        return row.slice(1);
      }
      return [];
    });
}

describe("odm-import-service", () => {
  it("imports the supported ODM subset and projects workbook tabs from the normalized model", async () => {
    const study: StudyDesign = {
      metadata: {
        protocolId: "ODM-ROUNDTRIP",
        studyName: "ODM Roundtrip Study",
        version: "2.5",
        defaultLanguage: "en-US",
      },
      events: [
        {
          eventOid: "SCREEN",
          eventName: "Screening",
          orderNumber: 1,
          eventType: EventType.SCHEDULED,
          forms: [
            { formOid: "VS", orderNumber: 1, mandatory: true },
            { formOid: "DM", orderNumber: 2, mandatory: true },
          ],
        },
      ],
      forms: {
        DM: {
          formOid: "DM",
          formName: "Demographics",
          orderNumber: 2,
          repeating: false,
          effectiveVersion: "2.5",
          itemGroups: [
            {
              groupOid: "DM_GRP",
              name: "Default Group",
              orderNumber: 1,
              repeating: false,
              items: [
                {
                  formOid: "DM",
                  groupOid: "DM_GRP",
                  itemOid: "SEX",
                  name: "SEX",
                  orderNumber: 1,
                  effectiveVersion: "2.5",
                  label: { "en-US": "Sex" },
                  dataType: DataType.CODELIST,
                  codelistId: "SEX",
                  validation: { required: true },
                },
              ],
            },
          ],
        },
        VS: {
          formOid: "VS",
          formName: "Vital Signs",
          orderNumber: 1,
          repeating: true,
          effectiveVersion: "2.5",
          itemGroups: [
            {
              groupOid: "VS_GRP",
              name: "Default Group",
              orderNumber: 1,
              repeating: false,
              items: [
                {
                  formOid: "VS",
                  groupOid: "VS_GRP",
                  itemOid: "WEIGHT",
                  name: "WEIGHT",
                  orderNumber: 1,
                  effectiveVersion: "2.5",
                  label: { "en-US": "Weight" },
                  dataType: DataType.FLOAT,
                  length: 8,
                  significantDigits: 1,
                  validation: { required: false },
                },
              ],
            },
          ],
        },
      },
      codelists: {
        SEX: {
          codelistId: "SEX",
          codelistName: "Sex",
          dataType: DataType.TEXT,
          items: [
            {
              codelistId: "SEX",
              codedValue: "M",
              decodedText: { "en-US": "Male" },
              orderNumber: 1,
            },
            {
              codelistId: "SEX",
              codedValue: "F",
              decodedText: { "en-US": "Female" },
              orderNumber: 2,
            },
          ],
        },
      },
    };

    const imported = await importOdmXml((await generateOdmXml(study)).xml);

    expect(imported.study.metadata.protocolId).toBe("ODM-ROUNDTRIP");
    expect(imported.study.metadata.studyName).toBe("ODM Roundtrip Study");
    expect(imported.study.metadata.version).toBe("2.5");
    expect(imported.projection.formsRows).toEqual([
      ["Form OID", "Form Name", "Repeating", "Page Layout"],
      ["VS", "Vital Signs", "Yes", "Portrait"],
      ["DM", "Demographics", "No", "Portrait"],
    ]);
    expect(imported.projection.codelistRows).toEqual([
      ["Codelist ID", "Codelist Name", "Coded Value", "Decode"],
      ["SEX", "Sex", "F", "Female"],
      ["SEX", "Sex", "M", "Male"],
    ]);
    expect(imported.summary.status).toBe("warnings");
    expect(imported.summary.actionsCount.addedForms).toBe(2);
    expect(imported.summary.actionsCount.addedCodelists).toBe(1);
    expect(imported.diagnostics.some((diagnostic) => diagnostic.category === "Unsupported")).toBe(
      true
    );

    const workbook = new ExcelJS.Workbook();
    workbook.addWorksheet("KeepMe").addRow(["do not remove"]);
    workbook.addWorksheet("_Study").addRow(["stale"]);
    workbook.addWorksheet("_Forms").addRow(["stale"]);
    workbook.addWorksheet("_Codelists").addRow(["stale"]);

    applyOdmImportToWorkbook(workbook, imported);

    expect(worksheetRows(workbook.getWorksheet("KeepMe")!)).toEqual([["do not remove"]]);
    expect(worksheetRows(workbook.getWorksheet("_Study")!)).toEqual(imported.projection.studyRows);
    expect(worksheetRows(workbook.getWorksheet("_Forms")!)).toEqual(imported.projection.formsRows);
    expect(worksheetRows(workbook.getWorksheet("_Codelists")!)).toEqual(
      imported.projection.codelistRows
    );
  });

  it("surfaces ambiguous and unsupported ODM constructs before workbook write-back", async () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ODM xmlns="http://www.cdisc.org/ns/odm/v1.3" ODMVersion="1.3.2">
  <Study OID="PROT-200">
    <GlobalVariables>
      <StudyName>Import Review Study</StudyName>
      <ProtocolName>PROT-200</ProtocolName>
    </GlobalVariables>
    <MetaDataVersion OID="MV.1.0" Name="Version 1.0">
      <FormDef Name="Missing OID" Repeating="No"></FormDef>
      <FormDef OID="DM" Name="Demographics" Repeating="No"></FormDef>
      <CodeList OID="YN" Name="Yes/No" DataType="text">
        <EnumeratedItem CodedValue="Y" />
      </CodeList>
      <ItemDef OID="IGNORED" Name="Ignored Item" DataType="text"></ItemDef>
    </MetaDataVersion>
    <MetaDataVersion OID="MV.2.0" Name="Version 2.0">
      <FormDef OID="VS" Name="Vital Signs" Repeating="Yes"></FormDef>
    </MetaDataVersion>
  </Study>
</ODM>`;

    const imported = await importOdmXml(xml);

    expect(imported.summary.status).toBe("conflicts");
    expect(imported.projection.formsRows).toEqual([
      ["Form OID", "Form Name", "Repeating", "Page Layout"],
      ["DM", "Demographics", "No", "Portrait"],
    ]);
    expect(imported.projection.codelistRows).toEqual([
      ["Codelist ID", "Codelist Name", "Coded Value", "Decode"],
      ["YN", "Yes/No", "Y", "Y"],
    ]);
    expect(
      imported.diagnostics.some((diagnostic) =>
        diagnostic.message.includes("Multiple MetaDataVersion")
      )
    ).toBe(true);
    expect(
      imported.diagnostics.some((diagnostic) =>
        diagnostic.message.includes("Encountered FormDef without an OID")
      )
    ).toBe(true);
    expect(
      imported.diagnostics.some((diagnostic) =>
        diagnostic.message.includes("ItemDef elements are not projected")
      )
    ).toBe(true);

    expect(() => applyOdmImportToWorkbook(new ExcelJS.Workbook(), imported)).toThrow(
      /blocking diagnostics/
    );
  });

  it("reports XML parse failures separately from semantic import diagnostics", async () => {
    const imported = await importOdmXml("<ODM><Study OID='P1'><MetaDataVersion></Study></ODM>");

    expect(imported.summary.status).toBe("conflicts");
    expect(imported.diagnostics).toHaveLength(1);
    expect(imported.diagnostics[0].category).toBe("Parse");
    expect(imported.diagnostics[0].message).toContain("Malformed ODM XML");
    expect(imported.projection.studyRows).toEqual([
      ["Protocol ID", "Study Name", "Version", "Default Language"],
      ["PROT-XXXX", "Untitled", "1.0", "en-US"],
    ]);
  });
});
