/**
 * @issue #78
 */
import { buildAnnotatedCrfDocument, renderToHtml } from "../acrf-renderer";
import { exportToPdf } from "../pdf-export-adapter";
import { StudyDesign, DataType } from "../../types";

jest.mock("html-to-pdfmake", () => {
  return jest.fn().mockReturnValue([{ text: "Mocked HTML" }]);
});

jest.mock("pdfmake/build/pdfmake", () => {
  return {
    createPdf: jest.fn(() => ({
      download: jest.fn(),
      getBlob: jest.fn((cb) => cb(new Blob())),
    })),
  };
});

jest.mock("pdfmake/build/vfs_fonts", () => {
  return {
    pdfMake: { vfs: {} },
  };
});

describe("aCRF Rendering Pipeline", () => {
  const mockStudy: StudyDesign = {
    metadata: {
      protocolId: "PRT-001",
      studyName: "Test Study",
      version: "1.0",
      defaultLanguage: "en-US",
      sponsor: "TestSponsor",
    },
    events: [],
    forms: {
      FORM_01: {
        formOid: "FORM_01",
        formName: "Demographics",
        repeating: false,
        orderNumber: 1,
        effectiveVersion: "1.0",
        itemGroups: [
          {
            groupOid: "GRP_01",
            name: "Main Group",
            orderNumber: 1,
            repeating: false,
            items: [
              {
                itemOid: "DM_BRTHDTC",
                name: "Birth Date",
                label: { "en-US": "Date of Birth" },
                dataType: DataType.DATE,
                orderNumber: 1,
                effectiveVersion: "1.0",
                formOid: "FORM_01",
                groupOid: "GRP_01",
                validation: { required: true },
                sdtmMapping: {
                  domain: "DM",
                  variable: "BRTHDTC",
                },
              },
              {
                itemOid: "VAR_02",
                name: "Test Var",
                label: { "en-US": "Test Variable" },
                dataType: DataType.TEXT,
                orderNumber: 2,
                effectiveVersion: "1.0",
                formOid: "FORM_01",
                groupOid: "GRP_01",
                validation: { required: false },
                adamMapping: {
                  dataset: "ADSL",
                  variable: "TESTVAR",
                },
              },
            ],
          },
        ],
      },
    },
    codelists: {},
    rules: [
      {
        ruleId: "RULE_01",
        ruleType: "Validation" as any,
        target: "DM_BRTHDTC",
        expression: "DM_BRTHDTC > TODAY",
        _sourceRowIndex: 10,
      },
    ],
  };

  test("buildAnnotatedCrfDocument creates a valid intermediate model", () => {
    const doc = buildAnnotatedCrfDocument(mockStudy);

    expect(doc.protocolId).toBe("PRT-001");
    expect(doc.forms).toHaveLength(1);
    expect(doc.forms[0].formOid).toBe("FORM_01");

    const item = doc.forms[0].itemGroups[0].items[0];
    expect(item.itemOid).toBe("DM_BRTHDTC");
    expect(item.annotations).toHaveLength(2); // SDTM + Rule

    const sdtmAnno = item.annotations.find((a) => a.label === "SDTM");
    expect(sdtmAnno?.content).toBe("[DM_BRTHDTC]<br/>Domain: DM | Var: BRTHDTC | NCI: N/A");

    const ruleAnno = item.annotations.find((a) => a.label === "Rule");
    expect(ruleAnno?.content).toBe("RULE_01");

    const adamItem = doc.forms[0].itemGroups[0].items[1];
    const adamAnno = adamItem.annotations.find((a) => a.label === "ADaM");
    expect(adamAnno?.content).toBe("ADSL.TESTVAR");
  });

  test("renderToHtml produces HTML string with expected content", () => {
    const doc = buildAnnotatedCrfDocument(mockStudy);
    const html = renderToHtml(doc);

    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("PRT-001");
    expect(html).toContain("Demographics");
    expect(html).toContain("[DM_BRTHDTC]<br/>Domain: DM | Var: BRTHDTC | NCI: N/A");
    expect(html).toContain("RULE_01");
    expect(html).toContain("ADSL.TESTVAR");
    expect(html).toContain('id="form-FORM_01"');
  });

  test("exportToPdf calls pdfmake with expected parameters", async () => {
    const html = "<html><body>Test</body></html>";
    await exportToPdf(html, "test.pdf");

    const pdfMake = require("pdfmake/build/pdfmake");
    expect(pdfMake.createPdf).toHaveBeenCalled();
  });
});
