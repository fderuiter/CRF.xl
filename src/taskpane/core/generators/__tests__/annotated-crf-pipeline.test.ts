/**
 * @issue #184
 */
import { TextEncoder, TextDecoder } from "util";
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;

import * as excelParser from "../../parser/excel-parser";
import * as annotationService from "../../services/annotation-service";
import * as pdfAdapter from "../../services/pdf-export-adapter";

// Mock dependencies BEFORE importing the pipeline
jest.mock("../../parser/excel-parser", () => ({
  parseExcelToStudyDesign: jest.fn(),
}));
jest.mock("../../services/annotation-service");
jest.mock("../../services/pdf-export-adapter", () => ({
  generatePdfBlobFromHtml: jest.fn(),
}));
jest.mock("html-to-docx", () => jest.fn());
jest.mock("../../../components/views/study-diff-view-utils", () => ({
  buildStudyDiffList: jest.fn(() => []),
}));

import { AnnotatedCrfPipeline } from "../annotated-crf-pipeline";
import HTMLtoDOCX from "html-to-docx";

describe("AnnotatedCrfPipeline", () => {
  const mockStudyDesign = {
    metadata: {
      protocolId: "PROT-001",
      studyName: "Test Study",
      version: "1.0",
      defaultLanguage: "en-US",
    },
    events: [],
    forms: {
      "FORM1": {
        formOid: "FORM1",
        formName: "Form 1",
        itemGroups: [
          {
            groupOid: "GROUP1",
            name: "Group 1",
            items: [
              {
                itemOid: "ITEM1",
                name: "Item 1",
                label: { "en-US": "Label 1" },
                dataType: "text",
                validation: { required: true },
              }
            ]
          }
        ]
      }
    },
    codelists: {},
  };

  const mockAnnotations = [
    {
      id: "anno-1",
      type: "SDTM",
      anchor: {
        logicalId: "ITEM1",
        address: "Sheet1!A1",
        sheetName: "Sheet1",
      },
      content: "DM.SUBJID",
      timestamp: "2023-01-01T00:00:00Z",
      version: 1,
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (excelParser.parseExcelToStudyDesign as jest.Mock).mockResolvedValue({
      studyDesign: mockStudyDesign,
      validationIssues: [],
    });
    (annotationService.loadAnnotationsFromStore as jest.Mock).mockResolvedValue(mockAnnotations);
    (pdfAdapter.generatePdfBlobFromHtml as jest.Mock).mockResolvedValue(new Blob(["mock pdf content"], { type: "application/pdf" }));
    (HTMLtoDOCX as jest.Mock).mockResolvedValue(new Blob(["mock docx content"], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }));
  });

  it("should execute all 6 stages correctly", async () => {
    const pipeline = new AnnotatedCrfPipeline();
    const result = await pipeline.execute();

    expect(result.document.protocolId).toBe("PROT-001");
    expect(result.manifest.stages).toHaveLength(6); // Stages 1-6 are executed, 7 is manifest generation itself
    expect(result.manifest.stages).toContain("Source Model Snapshot");
    expect(result.manifest.stages).toContain("Annotation Resolution");
    expect(result.manifest.stages).toContain("Document Structure Build");
    expect(result.manifest.stages).toContain("Output Verification");
    expect(result.manifest.stages).toContain("Render Model Build");
    expect(result.manifest.stages).toContain("Export Artifact Generation");

    expect(excelParser.parseExcelToStudyDesign).toHaveBeenCalled();
    expect(annotationService.loadAnnotationsFromStore).toHaveBeenCalled();
    expect(pdfAdapter.generatePdfBlobFromHtml).toHaveBeenCalled();
    expect(HTMLtoDOCX).toHaveBeenCalled();

    expect(result.manifest.diagnostics.some(d => d.message.includes("Completed stage: Export Artifact Generation"))).toBe(true);
  });

  it("should include annotations in the document structure", async () => {
    const pipeline = new AnnotatedCrfPipeline();
    const result = await pipeline.execute();

    const item = result.document.forms[0].itemGroups[0].items[0];
    expect(item.itemOid).toBe("ITEM1");
    expect(item.annotations.some(a => a.content === "DM.SUBJID")).toBe(true);
  });

  it("should handle pipeline failures gracefully", async () => {
    (excelParser.parseExcelToStudyDesign as jest.Mock).mockRejectedValue(new Error("Parse failed"));

    const pipeline = new AnnotatedCrfPipeline();
    await expect(pipeline.execute()).rejects.toThrow("Parse failed");
  });
});
