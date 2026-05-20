/* eslint-disable no-undef */
import { generateOdmXml } from "../odm-builder";
import { StudyDesign, DataType, EventType, RuleType } from "../../../types";

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

  describe("Rule pre-serialization validation", () => {
    it("should throw OdmSerializationError on circular rule dependencies", () => {
      mockStudy.rules = [
        {
          ruleId: "RULE_A",
          ruleType: RuleType.VALIDATION,
          expression: "RULE_B == 1",
          _sourceRowIndex: 2,
        },
        {
          ruleId: "RULE_B",
          ruleType: RuleType.VALIDATION,
          expression: "RULE_A == 1",
          _sourceRowIndex: 3,
        },
      ];

      // Parse the rule expressions to generate their ASTs so dependency validator can traverse them
      const { parseRuleExpression } = require("../../../parser/rules-parser");
      mockStudy.rules[0].ast = parseRuleExpression(mockStudy.rules[0].expression);
      mockStudy.rules[1].ast = parseRuleExpression(mockStudy.rules[1].expression);

      expect(() => generateOdmXml(mockStudy)).toThrow("Rule pre-serialization validation failed");
    });

    it("should throw OdmSerializationError on duplicate rule IDs", () => {
      mockStudy.rules = [
        {
          ruleId: "R1",
          ruleType: RuleType.VALIDATION,
          expression: "IT_WT > 0",
          _sourceRowIndex: 2,
        },
        {
          ruleId: "R1",
          ruleType: RuleType.VALIDATION,
          expression: "IT_WT < 300",
          _sourceRowIndex: 3,
        },
      ];

      const { parseRuleExpression } = require("../../../parser/rules-parser");
      mockStudy.rules[0].ast = parseRuleExpression(mockStudy.rules[0].expression);
      mockStudy.rules[1].ast = parseRuleExpression(mockStudy.rules[1].expression);

      expect(() => generateOdmXml(mockStudy)).toThrow("Rule pre-serialization validation failed");
    });
  });

  describe("Rule CDISC Element Mapping", () => {
    it("should serialize VALIDATION and SHOW_IF rules to ConditionDef and DERIVATION rules to MethodDef", () => {
      mockStudy.forms.F1.itemGroups[0].items.push(
        {
          itemOid: "IT_PREG",
          name: "Pregnancy Status",
          formOid: "F1",
          groupOid: "G1",
          orderNumber: 2,
          dataType: DataType.INTEGER,
          label: { "en-US": "Pregnancy Status" },
          effectiveVersion: "1.0",
          validation: { required: false },
        },
        {
          itemOid: "WT",
          name: "Weight",
          formOid: "F1",
          groupOid: "G1",
          orderNumber: 3,
          dataType: DataType.FLOAT,
          label: { "en-US": "Weight" },
          effectiveVersion: "1.0",
          validation: { required: false },
        },
        {
          itemOid: "HT",
          name: "Height",
          formOid: "F1",
          groupOid: "G1",
          orderNumber: 4,
          dataType: DataType.FLOAT,
          label: { "en-US": "Height" },
          effectiveVersion: "1.0",
          validation: { required: false },
        }
      );

      mockStudy.rules = [
        {
          ruleId: "VAL_WT",
          ruleType: RuleType.VALIDATION,
          target: "IT_WT",
          expression: "IT_WT > 0",
          errorMessage: "Weight must be positive",
          _sourceRowIndex: 2,
        },
        {
          ruleId: "SHOW_WT",
          ruleType: RuleType.SHOW_IF,
          target: "IT_WT",
          expression: "IT_PREG == 'N'",
          description: "Show weight only if not pregnant",
          _sourceRowIndex: 3,
        },
        {
          ruleId: "DERIVE_BMI",
          ruleType: RuleType.DERIVATION,
          target: "IT_WT",
          expression: "WT / (HT * HT)",
          description: "Compute BMI from WT and HT",
          _sourceRowIndex: 4,
        },
      ];

      const { parseRuleExpression } = require("../../../parser/rules-parser");
      mockStudy.rules[0].ast = parseRuleExpression(mockStudy.rules[0].expression);
      mockStudy.rules[1].ast = parseRuleExpression(mockStudy.rules[1].expression);
      mockStudy.rules[2].ast = parseRuleExpression(mockStudy.rules[2].expression);

      const xml = generateOdmXml(mockStudy);

      // Check ConditionDefs
      expect(xml).toContain('<ConditionDef OID="VAL_WT" Name="VAL_WT">');
      expect(xml).toContain(
        '<TranslatedText xml:lang="en-US">Weight must be positive</TranslatedText>'
      );
      expect(xml).toContain('<FormalExpression Context="CRF.xl">IT_WT &gt; 0</FormalExpression>');

      expect(xml).toContain('<ConditionDef OID="SHOW_WT" Name="SHOW_WT">');
      expect(xml).toContain(
        '<TranslatedText xml:lang="en-US">Show weight only if not pregnant</TranslatedText>'
      );
      expect(xml).toContain(
        '<FormalExpression Context="CRF.xl">IT_PREG == &apos;N&apos;</FormalExpression>'
      );

      // Check MethodDef
      expect(xml).toContain('<MethodDef OID="DERIVE_BMI" Name="DERIVE_BMI" Type="Computation">');
      expect(xml).toContain(
        '<TranslatedText xml:lang="en-US">Compute BMI from WT and HT</TranslatedText>'
      );
      expect(xml).toContain('<FormalExpression Context="CRF.xl">WT / (HT * HT)</FormalExpression>');
    });

    it("should sort ConditionDef and MethodDef according to topological dependency order", () => {
      // RULE_A depends on RULE_B, which depends on RULE_C
      mockStudy.rules = [
        {
          ruleId: "RULE_A",
          ruleType: RuleType.VALIDATION,
          expression: "RULE_B == true",
          _sourceRowIndex: 2,
        },
        {
          ruleId: "RULE_B",
          ruleType: RuleType.VALIDATION,
          expression: "RULE_C == true",
          _sourceRowIndex: 3,
        },
        {
          ruleId: "RULE_C",
          ruleType: RuleType.VALIDATION,
          expression: "true",
          _sourceRowIndex: 4,
        },
      ];

      const { parseRuleExpression } = require("../../../parser/rules-parser");
      mockStudy.rules[0].ast = parseRuleExpression(mockStudy.rules[0].expression);
      mockStudy.rules[1].ast = parseRuleExpression(mockStudy.rules[1].expression);
      mockStudy.rules[2].ast = parseRuleExpression(mockStudy.rules[2].expression);

      const xml = generateOdmXml(mockStudy);

      // Since C is evaluated first, then B, then A:
      // Topological order is [RULE_C, RULE_B, RULE_A]
      const indexC = xml.indexOf('OID="RULE_C"');
      const indexB = xml.indexOf('OID="RULE_B"');
      const indexA = xml.indexOf('OID="RULE_A"');

      expect(indexC).toBeLessThan(indexB);
      expect(indexB).toBeLessThan(indexA);
    });

    it("should link derivation rules via MethodOID in ItemDef", () => {
      mockStudy.rules = [
        {
          ruleId: "DERIVE_WT",
          ruleType: RuleType.DERIVATION,
          target: "IT_WT",
          expression: "150",
          _sourceRowIndex: 2,
        },
      ];

      const { parseRuleExpression } = require("../../../parser/rules-parser");
      mockStudy.rules[0].ast = parseRuleExpression(mockStudy.rules[0].expression);

      const xml = generateOdmXml(mockStudy);
      expect(xml).toContain(
        '<ItemDef OID="IT_WT" Name="Weight" DataType="float" Length="8" SignificantDigits="1" SASFieldName="WT" MethodOID="DERIVE_WT">'
      );
    });

    it("should link show-if rules via CollectionExceptionConditionOID in ItemRef", () => {
      mockStudy.rules = [
        {
          ruleId: "SHOW_WT",
          ruleType: RuleType.SHOW_IF,
          target: "IT_WT",
          expression: "1",
          _sourceRowIndex: 2,
        },
      ];

      const { parseRuleExpression } = require("../../../parser/rules-parser");
      mockStudy.rules[0].ast = parseRuleExpression(mockStudy.rules[0].expression);

      const xml = generateOdmXml(mockStudy);
      expect(xml).toContain(
        '<ItemRef ItemOID="IT_WT" OrderNumber="1" Mandatory="Yes" CollectionExceptionConditionOID="SHOW_WT"/>'
      );
    });

    it("should log warnings and embed comment warnings for unresolved rule targets", () => {
      mockStudy.rules = [
        {
          ruleId: "RULE_NONEXISTENT",
          ruleType: RuleType.DERIVATION,
          target: "NONEXISTENT_VAR",
          expression: "100",
          _sourceRowIndex: 2,
        },
      ];

      const { parseRuleExpression } = require("../../../parser/rules-parser");
      mockStudy.rules[0].ast = parseRuleExpression(mockStudy.rules[0].expression);

      const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
      const xml = generateOdmXml(mockStudy);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Derivation target 'NONEXISTENT_VAR' not found in study design")
      );
      expect(xml).toContain("CRF.xl Serialization Warnings:");
      expect(xml).toContain("Derivation target 'NONEXISTENT_VAR' not found in study design");

      consoleWarnSpy.mockRestore();
    });
  });

  describe("VLM & Methods Serialization Integration", () => {
    it("should serialize study.methods to MethodDef elements", () => {
      mockStudy.methods = {
        "M_BMI": {
          methodOid: "M_BMI",
          name: "BMI Derivation",
          type: "Computation",
          description: "Calculates BMI",
          expression: "[WEIGHT] / ([HEIGHT]/100)^2",
        },
      };

      const xml = generateOdmXml(mockStudy);
      expect(xml).toContain('<MethodDef OID="M_BMI" Name="BMI Derivation" Type="Computation">');
      expect(xml).toContain('<Description>');
      expect(xml).toContain('<TranslatedText xml:lang="en-US">Calculates BMI</TranslatedText>');
      expect(xml).toContain('<FormalExpression Context="CRF.xl">[WEIGHT] / ([HEIGHT]/100)^2</FormalExpression>');
    });

    it("should serialize Origin, Comment and explicit MethodOID directly onto ItemDef elements", () => {
      const item = mockStudy.forms["F1"].itemGroups[0].items[0];
      item.origin = "Pre-Specified" as any;
      item.comment = "Collected weight at baseline";
      item.methodOid = "M_WT_COLLECT";

      mockStudy.methods = {
        "M_WT_COLLECT": {
          methodOid: "M_WT_COLLECT",
          name: "Collect Weight",
          type: "Interview",
        }
      };

      const xml = generateOdmXml(mockStudy);
      expect(xml).toContain('Origin="Pre-Specified"');
      expect(xml).toContain('Comment="Collected weight at baseline"');
      expect(xml).toContain('MethodOID="M_WT_COLLECT"');
    });

    it("should prioritize item.methodOid over rules-derived MethodOID on ItemDef", () => {
      const item = mockStudy.forms["F1"].itemGroups[0].items[0];
      item.methodOid = "M_EXPLICIT_BMI";

      mockStudy.rules = [
        {
          ruleId: "M_RULE_BMI",
          ruleType: RuleType.DERIVATION,
          target: "IT_WT",
          expression: "100",
          _sourceRowIndex: 2,
        },
      ];

      const { parseRuleExpression } = require("../../../parser/rules-parser");
      mockStudy.rules[0].ast = parseRuleExpression(mockStudy.rules[0].expression);

      mockStudy.methods = {
        "M_EXPLICIT_BMI": {
          methodOid: "M_EXPLICIT_BMI",
          name: "Explicit BMI",
          type: "Computation",
        }
      };

      const xml = generateOdmXml(mockStudy);
      // It should contain the explicit MethodOID instead of the rule's ID
      expect(xml).toContain('MethodOID="M_EXPLICIT_BMI"');
      expect(xml).not.toContain('MethodOID="M_RULE_BMI"');
    });
  });
});
