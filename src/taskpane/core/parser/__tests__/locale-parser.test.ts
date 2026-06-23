/**
 * @issue #40
 */
import { parseRawDataToStudyDesign } from "../parser-engine";
import { DataType } from "../../types";

describe("Locale-Aware Parsing", () => {
  it("should parse standard single-language codelists (regression)", async () => {
    const rawData = {
      "_Study": [
        ["Protocol ID", "Study Name", "Version", "Default Language"],
        ["PROT-001", "Test Study", "1.0", "en-US"],
      ],
      "_Codelists": [
        ["ID", "Name", "Code", "Decode"],
        ["CL1", "YesNo", "1", "Yes"],
        ["CL1", "YesNo", "0", "No"],
      ],
    };

    const studyDesign = await parseRawDataToStudyDesign(rawData);
    expect(studyDesign.codelists["CL1"]).toBeDefined();
    expect(studyDesign.codelists["CL1"].items[0].decodedText["en-US"]).toBe("Yes");
    expect(studyDesign.codelists["CL1"].items[1].decodedText["en-US"]).toBe("No");
  });

  it("should parse multi-language codelists", async () => {
    const rawData = {
      "_Study": [
        ["Protocol ID", "Study Name", "Version", "Default Language"],
        ["PROT-001", "Test Study", "1.0", "en-US"],
      ],
      "_Codelists": [
        ["ID", "Name", "Code", "Decode", "Decode(es-ES)", "Decode (fr-FR)"],
        ["CL1", "YesNo", "1", "Yes", "Sí", "Oui"],
        ["CL1", "YesNo", "0", "No", "No", "Non"],
      ],
    };

    const studyDesign = await parseRawDataToStudyDesign(rawData);
    const item1 = studyDesign.codelists["CL1"].items[0];
    expect(item1.decodedText["en-US"]).toBe("Yes");
    expect(item1.decodedText["es-ES"]).toBe("Sí");
    expect(item1.decodedText["fr-FR"]).toBe("Oui");

    const item2 = studyDesign.codelists["CL1"].items[1];
    expect(item2.decodedText["en-US"]).toBe("No");
    expect(item2.decodedText["es-ES"]).toBe("No");
    expect(item2.decodedText["fr-FR"]).toBe("Non");
  });

  it("should ignore empty translation cells", async () => {
    const rawData = {
      "_Study": [
        ["Protocol ID", "Study Name", "Version", "Default Language"],
        ["PROT-001", "Test Study", "1.0", "en-US"],
      ],
      "_Codelists": [
        ["ID", "Name", "Code", "Decode", "Decode (es-ES)"],
        ["CL1", "YesNo", "1", "Yes", ""],
      ],
    };

    const studyDesign = await parseRawDataToStudyDesign(rawData);
    const item = studyDesign.codelists["CL1"].items[0];
    expect(item.decodedText["en-US"]).toBe("Yes");
    expect(item.decodedText["es-ES"]).toBeUndefined();
  });

  it("should report duplicate locale columns as warnings", async () => {
    const rawData = {
      "_Study": [
        ["Protocol ID", "Study Name", "Version", "Default Language"],
        ["PROT-001", "Test Study", "1.0", "en-US"],
      ],
      "_Codelists": [
        ["ID", "Name", "Code", "Decode (es-ES)", "Decode (es-ES)"],
        ["CL1", "YesNo", "1", "Sí-1", "Sí-2"],
      ],
    };

    const studyDesign = await parseRawDataToStudyDesign(rawData);
    const warnings = studyDesign.metadata.customProperties?.parseWarnings || [];
    expect(warnings.some((w: string) => w.includes("Duplicate locale column detected in _Codelists: Decode (es-ES)"))).toBe(true);
    // Should take the first one
    expect(studyDesign.codelists["CL1"].items[0].decodedText["es-ES"]).toBe("Sí-1");
  });

  it("should parse multi-language CRF labels and instructions", async () => {
    const rawData = {
      "_Study": [
        ["Protocol ID", "Study Name", "Version", "Default Language"],
        ["PROT-001", "Test Study", "1.0", "en-US"],
      ],
      "_Forms": [
        ["ID", "Name", "Repeating"],
        ["F1", "Form 1", "No"],
      ],
      "F1": [
        ["Variable Name", "Label", "Label (es-ES)", "Instructions", "Instructions (es-ES)", "Variable Type"],
        ["VAR1", "Weight", "Peso", "Measure weight", "Mida el peso", "Integer"],
      ],
    };

    const studyDesign = await parseRawDataToStudyDesign(rawData);
    const item = studyDesign.forms["F1"].itemGroups[0].items[0] as any;

    expect(item.label["en-US"]).toBe("Weight");
    expect(item.label["es-ES"]).toBe("Peso");
    expect(item.instructions["en-US"]).toBe("Measure weight");
    expect(item.instructions["es-ES"]).toBe("Mida el peso");
  });

  it("should support Question / Text (locale) pattern", async () => {
    const rawData = {
      "_Study": [
        ["Protocol ID", "Study Name", "Version", "Default Language"],
        ["PROT-001", "Test Study", "1.0", "en-US"],
      ],
      "_Forms": [
        ["ID", "Name", "Repeating"],
        ["F1", "Form 1", "No"],
      ],
      "F1": [
        ["Variable Name", "Question / Text (es-ES)", "Variable Type"],
        ["VAR1", "Pregunta", "Integer"],
      ],
    };

    const studyDesign = await parseRawDataToStudyDesign(rawData);
    const item = studyDesign.forms["F1"].itemGroups[0].items[0] as any;
    expect(item.label["es-ES"]).toBe("Pregunta");
  });

  it("should fall back to positional indices for _Codelists if headers are missing", async () => {
    const rawData = {
       "_Study": [
        ["Protocol ID", "Study Name", "Version", "Default Language"],
        ["PROT-001", "Test Study", "1.0", "en-US"],
      ],
      "_Codelists": [
        // No header row or malformed header row
        ["CL1", "YesNo", "1", "Yes"],
        ["CL1", "YesNo", "0", "No"],
      ],
    };

    const studyDesign = await parseRawDataToStudyDesign(rawData);
    expect(studyDesign.codelists["CL1"]).toBeDefined();
    expect(studyDesign.codelists["CL1"].items[0].decodedText["en-US"]).toBe("Yes");
  });
});
