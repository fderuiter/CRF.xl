import { generateOdmXml } from "../odm-builder";
import { StudyDesign, DataType, EventType } from "../../../types";

describe("CDISC ODM XML Builder", () => {
  let mockStudy: StudyDesign;

  beforeEach(() => {
    mockStudy = {
      metadata: {
        protocolId: "TEST-01",
        studyName: "Unit Test Study",
        version: "1.0",
        defaultLanguage: "en-US",
      },
      events: [
        {
          eventOid: "V1",
          eventName: "Visit 1",
          orderNumber: 1,
          eventType: EventType.SCHEDULED,
          forms: [{ formOid: "F1", orderNumber: 1, mandatory: true }],
        },
      ],
      forms: {
        F1: {
          formOid: "F1",
          formName: "Form 1",
          orderNumber: 1,
          repeating: false,
          effectiveVersion: "1.0",
          itemGroups: [
            {
              groupOid: "G1",
              name: "Group 1",
              repeating: false,
              orderNumber: 1,
              items: [
                {
                  itemOid: "IT_WT",
                  name: "Weight",
                  formOid: "F1",
                  groupOid: "G1",
                  orderNumber: 1,
                  dataType: DataType.FLOAT,
                  label: { "en-US": "Subject Weight" },
                  effectiveVersion: "1.0",
                  length: 8,
                  significantDigits: 1,
                  validation: { required: true },
                  sdtmMapping: { domain: "VS", variable: "VSORRES", sasFieldName: "WT" },
                  showIf: "IT.PREG == 'N'", // Custom branching script
                },
              ],
            },
          ],
        },
      },
      codelists: {},
    };
  });

  it("should generate valid root ODM structure and Study OID", () => {
    const xml = generateOdmXml(mockStudy);
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<ODM xmlns="http://www.cdisc.org/ns/odm/v1.3"');
    expect(xml).toContain('<Study OID="TEST-01">');
  });

  it("should serialize clinical items with correct CDISC data types and SAS attributes", () => {
    const xml = generateOdmXml(mockStudy);
    expect(xml).toContain(
      '<ItemDef OID="IT_WT" Name="Weight" DataType="float" Length="8" SignificantDigits="1" SASFieldName="WT">'
    );
    expect(xml).toContain('<TranslatedText xml:lang="en-US">Subject Weight</TranslatedText>');
  });

  it("should serialize SDTM mappings into Alias tags", () => {
    const xml = generateOdmXml(mockStudy);
    expect(xml).toContain('<Alias Context="SDTM" Name="VS.VSORRES"/>');
  });

  it("should extract 'showIf' logic and construct a standalone ConditionDef", () => {
    const xml = generateOdmXml(mockStudy);
    // The condition should exist globally
    expect(xml).toContain('<ConditionDef OID="COND.IT_WT"');
    expect(xml).toContain("IT.PREG == 'N'");
    // The item should reference the condition
    expect(xml).toContain('CollectionExceptionConditionOID="COND.IT_WT"');
  });
});
