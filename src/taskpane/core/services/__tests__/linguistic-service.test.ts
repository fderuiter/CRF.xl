/**
 * @issue #39, #86
 */
import { extractTranslatableItems, getTranslationStatus } from "../linguistic-service";
import { StudyDesign, DataType, TranslationStatus } from "../../types";

describe("Linguistic Service", () => {
  const mockStudy: StudyDesign = {
    metadata: {
      protocolId: "PROT-001",
      studyName: "Test Study",
      version: "1.0",
      defaultLanguage: "en-US",
      supportedLanguages: ["en-US", "es-ES", "fr-FR"],
    },
    events: [],
    forms: {
      "F1": {
        formOid: "F1",
        formName: "Form 1",
        repeating: false,
        orderNumber: 1,
        effectiveVersion: "1.0",
        itemGroups: [
          {
            groupOid: "G1",
            name: "Group 1",
            orderNumber: 1,
            repeating: false,
            items: [
              {
                nodeType: "item",
                formOid: "F1",
                groupOid: "G1",
                itemOid: "VAR1",
                name: "VAR1",
                orderNumber: 1,
                effectiveVersion: "1.0",
                label: {
                  "en-US": "Weight",
                  "es-ES": "Peso"
                },
                instructions: {
                  "en-US": "Measure weight"
                },
                dataType: DataType.INTEGER,
                validation: { required: true },
                rowIndex: 2
              } as any
            ]
          }
        ]
      }
    },
    codelists: {
      "CL1": {
        codelistId: "CL1",
        codelistName: "YesNo",
        dataType: DataType.TEXT,
        items: [
          {
            codelistId: "CL1",
            codedValue: "1",
            decodedText: {
              "en-US": "Yes",
              "fr-FR": "Oui"
            },
            orderNumber: 1,
            rowIndex: 1
          } as any
        ]
      }
    }
  };

  it("should extract translatable items correctly", () => {
    const items = extractTranslatableItems(mockStudy);

    // Label for VAR1
    const labelItem = items.find(i => i.id === "item:F1:VAR1:label");
    expect(labelItem).toBeDefined();
    expect(labelItem?.baseValue).toBe("Weight");
    expect(labelItem?.translations["es-ES"]).toBe("Peso");

    // Instructions for VAR1
    const instItem = items.find(i => i.id === "item:F1:VAR1:instruction");
    expect(instItem).toBeDefined();
    expect(instItem?.baseValue).toBe("Measure weight");

    // Codelist decode for CL1
    const decodeItem = items.find(i => i.id === "codelist:CL1:1:decode");
    expect(decodeItem).toBeDefined();
    expect(decodeItem?.baseValue).toBe("Yes");
    expect(decodeItem?.translations["fr-FR"]).toBe("Oui");
  });

  it("should correctly identify translation status", () => {
    const items = extractTranslatableItems(mockStudy);
    const labelItem = items.find(i => i.id === "item:F1:VAR1:label")!;

    expect(getTranslationStatus(labelItem, "en-US")).toBe(TranslationStatus.Translated);
    expect(getTranslationStatus(labelItem, "es-ES")).toBe(TranslationStatus.Translated);
    expect(getTranslationStatus(labelItem, "fr-FR")).toBe(TranslationStatus.Missing);
  });
});
