/**
 * @issue #28
 */
/** @jest-environment node */
/* global describe, it, expect, process */
import ExcelJS from "exceljs";
import path from "path";
import {
  BaselineWorkbookParseError,
  parseBaselineWorkbookBuffer,
  parseBaselineWorkbookFile,
} from "../baseline-workbook-service";

describe("baseline-workbook-service", () => {
  it("parses a valid CRF.xl workbook fixture into StudyDesign", async () => {
    const fixturePath = path.resolve(
      process.cwd(),
      "test/fixtures/reference-study/reference-study.xlsx"
    );
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(fixturePath);
    const buffer = toArrayBuffer(await workbook.xlsx.writeBuffer());

    const study = await parseBaselineWorkbookBuffer(buffer, "reference-study.xlsx");

    expect(study.metadata.protocolId).not.toBe("PROT-XXXX");
    expect(study.metadata.studyName).not.toBe("Untitled");
    expect(Object.keys(study.forms).length).toBeGreaterThan(0);
  });

  it("rejects workbooks missing required CRF.xl sheets", async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.addWorksheet("OnlyOneSheet");
    const buffer = toArrayBuffer(await workbook.xlsx.writeBuffer());

    await expect(parseBaselineWorkbookBuffer(buffer, "incomplete.xlsx")).rejects.toThrow(
      BaselineWorkbookParseError
    );
  });

  it("rejects non-.xlsx baseline files before parsing", async () => {
    const fakeFile = {
      name: "baseline.txt",
      size: 12,
      arrayBuffer: async () => new ArrayBuffer(12),
    } as any;

    await expect(parseBaselineWorkbookFile(fakeFile)).rejects.toThrow(BaselineWorkbookParseError);
  });
});

function toArrayBuffer(buffer: ArrayBuffer | Uint8Array): ArrayBuffer {
  if (buffer instanceof ArrayBuffer) {
    return buffer;
  }
  const copy = new Uint8Array(buffer.byteLength);
  copy.set(buffer);
  return copy.buffer;
}
