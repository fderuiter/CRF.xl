/**
 * @issue #184
 */
import { StudyDesign, AnnotatedCrfDocument } from "../../types";
import { verifyAnnotatedCrf } from "../acrf-output-validator";

describe("AcrfOutputValidator", () => {
  const mockStudy: StudyDesign = {
    metadata: {
      protocolId: "PROT-001",
      studyName: "Test Study",
      version: "1.0",
      defaultLanguage: "en-US",
    },
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
                dataType: "text" as any,
                sdtmMapping: { domain: "DM", variable: "SUBJID" },
              }
            ]
          }
        ]
      }
    },
  } as any;

  const mockDoc: AnnotatedCrfDocument = {
    protocolId: "PROT-001",
    studyName: "Test Study",
    version: "1.0",
    generatedAt: new Date().toISOString(),
    forms: [
      {
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
                annotations: [
                  { type: "SDTM" as any, label: "SDTM", content: "DM.SUBJID" }
                ]
              }
            ]
          }
        ]
      }
    ]
  } as any;

  it("should validate a correct document", () => {
    const result = verifyAnnotatedCrf(mockStudy, mockDoc);
    expect(result.isValid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it("should catch missing Protocol ID", () => {
    const badDoc = { ...mockDoc, protocolId: "UNKNOWN" };
    const result = verifyAnnotatedCrf(mockStudy, badDoc);
    expect(result.isValid).toBe(false);
    expect(result.issues.some(i => i.category === "Metadata")).toBe(true);
  });

  it("should catch missing forms", () => {
    const badDoc = { ...mockDoc, forms: [] };
    const result = verifyAnnotatedCrf(mockStudy, badDoc);
    expect(result.isValid).toBe(false);
    expect(result.issues.some(i => i.category === "Structure" && i.message.includes("missing"))).toBe(true);
  });

  it("should catch orphan forms", () => {
    const badDoc = {
      ...mockDoc,
      forms: [...mockDoc.forms, { formOid: "ORPHAN", itemGroups: [] }]
    } as any;
    const result = verifyAnnotatedCrf(mockStudy, badDoc);
    expect(result.isValid).toBe(false);
    expect(result.issues.some(i => i.message.includes("Orphan"))).toBe(true);
  });

  it("should catch SDTM content mismatch", () => {
    const badDoc = JSON.parse(JSON.stringify(mockDoc));
    badDoc.forms[0].itemGroups[0].items[0].annotations[0].content = "WRONG.CONTENT";
    const result = verifyAnnotatedCrf(mockStudy, badDoc);
    expect(result.isValid).toBe(false);
    expect(result.issues.some(i => i.category === "Consistency")).toBe(true);
  });
});
