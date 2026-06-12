import { SourceRegistry } from "../source-registry";
/**
 * @issue #28
 */
/* eslint-disable no-undef */
import { validateRules } from "../dag-validator";
import { parseRuleExpression } from "../rules-parser";
import { RuleDefinition, RuleType, StudyDesign, DataType } from "../../types/index";
import { validateStudyDesign } from "../validator";

describe("CRF.xl Rules Dependency & Graph Validator", () => {
  // Helper to quickly build valid ASTs for test rules
  function makeRule(
    ruleId: string,
    expression: string,
    ruleType: RuleType = RuleType.VALIDATION,
    target?: string,
    sourceRowIndex: number = 2
  ): RuleDefinition {
    const rule: any = {
      ruleId,
      ruleType,
      target,
      expression,
      ast: parseRuleExpression(expression),
    };
    SourceRegistry.register(rule, { sourceRowIndex });
    return rule;
  }

  describe("Topological Sorting & Valid DAGs", () => {
    it("should sort an independent set of rules with no dependencies", async () => {
      const r1 = makeRule("R_001", "WT > 0");
      const r2 = makeRule("R_002", "AGE >= 18");

      const result = await validateRules([r1, r2]);

      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
      // Since they are independent, any topological order is valid, but all should be present
      expect(result.topologicalOrder).toContain("R_001");
      expect(result.topologicalOrder).toContain("R_002");
      expect(result.topologicalOrder.length).toBe(2);
    });

    it("should correctly resolve direct Rule ID references and sort them", async () => {
      // R_002 depends directly on R_001's verification outcome
      const r1 = makeRule("R_001", "WT > 0");
      const r2 = makeRule("R_002", "R_001 && AGE >= 18");

      const result = await validateRules([r1, r2]);

      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
      expect(result.dependencyMap["R_002"]).toEqual(["R_001"]);
      // R_001 must be evaluated before R_002
      const index1 = result.topologicalOrder.indexOf("R_001");
      const index2 = result.topologicalOrder.indexOf("R_002");
      expect(index1).toBeLessThan(index2);
    });

    it("should correctly resolve derived target variables and sort them", async () => {
      // R_003 (BMI) depends on target WT (derived by R_002) and HT (raw field)
      const r1 = makeRule("R_001", "AGE >= 18");
      const r2 = makeRule("R_002", "VS.WT_RAW + 2", RuleType.DERIVATION, "WT");
      const r3 = makeRule("R_003", "WT / (HT * HT)", RuleType.DERIVATION, "BMI");

      const result = await validateRules([r1, r2, r3]);

      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
      expect(result.dependencyMap["R_003"]).toContain("R_002");

      const indexWT = result.topologicalOrder.indexOf("R_002");
      const indexBMI = result.topologicalOrder.indexOf("R_003");
      expect(indexWT).toBeLessThan(indexBMI);
    });

    it("should resolve qualified variable paths to their base targets", async () => {
      // R_002 references VISIT_1.VS.WT which resolves to WT derived by R_001
      const r1 = makeRule("R_001", "100", RuleType.DERIVATION, "WT");
      const r2 = makeRule("R_002", "VISIT_1.VS.WT > 50");

      const result = await validateRules([r1, r2]);

      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
      expect(result.dependencyMap["R_002"]).toEqual(["R_001"]);
    });
  });

  describe("Circular Dependency & Loop Detection", () => {
    it("should detect a simple self-reference cycle", async () => {
      const r1 = makeRule("R_001", "R_001 && WT > 0");

      const result = await validateRules([r1]);

      expect(result.isValid).toBe(false);
      const cycleError = result.errors.find((e) => e.type === "CYCLE");
      expect(cycleError).toBeDefined();
      expect(cycleError?.message).toContain("R_001 -> R_001");
      expect(cycleError?.actionableExplanation).toContain("Rule 'R_001' -> Rule 'R_001'");
      expect(result.topologicalOrder).toEqual([]); // Topological sort is blocked
    });

    it("should detect direct 2-rule circular dependencies", async () => {
      const r1 = makeRule("R_001", "R_002 && WT > 10");
      const r2 = makeRule("R_002", "R_001 || HT < 180");

      const result = await validateRules([r1, r2]);

      expect(result.isValid).toBe(false);
      const cycleError = result.errors.find((e) => e.type === "CYCLE");
      expect(cycleError).toBeDefined();
      expect(cycleError?.cyclePath).toEqual(["R_001", "R_002", "R_001"]);
      expect(cycleError?.actionableExplanation).toContain("Rule 'R_001' -> Rule 'R_002'");
      expect(cycleError?.actionableExplanation).toContain("Rule 'R_002' -> Rule 'R_001'");
    });

    it("should detect complex 3-rule circular loops", async () => {
      const r1 = makeRule("R_001", "R_002 && WT > 0");
      const r2 = makeRule("R_002", "BMI > 25", RuleType.DERIVATION, "BMI"); // BMI references BMI, but let's make it loop to HT
      const r3 = makeRule("R_003", "R_001", RuleType.DERIVATION, "HT");

      // Let R_002 depend on HT (R_003)
      r2.expression = "HT * 2";
      r2.ast = parseRuleExpression("HT * 2");

      const result = await validateRules([r1, r2, r3]);

      expect(result.isValid).toBe(false);
      const cycleError = result.errors.find((e) => e.type === "CYCLE");
      expect(cycleError).toBeDefined();
      // Canonicalized sequence contains all participating rules
      expect(cycleError?.message).toContain("R_001 -> R_002 -> R_003 -> R_001");
    });
  });

  describe("Broken & Unresolved Dependency References", () => {
    it("should flag a broken reference to a non-existent rule ID", async () => {
      const r1 = makeRule("R_001", "R_999 && WT > 0");

      const result = await validateRules([r1]);

      expect(result.isValid).toBe(false);
      const brokenError = result.errors.find((e) => e.type === "BROKEN_REFERENCE");
      expect(brokenError).toBeDefined();
      expect(brokenError?.message).toBe(
        "Rule 'R_001' depends on rule 'R_999' which does not exist."
      );
      expect(brokenError?.sourceRowIndex).toBe(2);
    });

    it("should verify valid variables and report unresolved references when StudyDesign is provided", async () => {
      const r1 = makeRule("R_001", "WT > 0 && UNKNOWN_FIELD == 42");

      const mockStudy: StudyDesign = {
        metadata: { protocolId: "P-01", studyName: "Test", version: "1.0", defaultLanguage: "en" },
        events: [],
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
                    itemOid: "WT",
                    name: "Weight",
                    formOid: "F1",
                    groupOid: "G1",
                    orderNumber: 1,
                    dataType: DataType.FLOAT,
                    label: { en: "WT" },
                    effectiveVersion: "1.0",
                    validation: { required: false },
                  },
                ],
              },
            ],
          },
        },
        codelists: {},
      };

      const result = await validateRules([r1], mockStudy);

      expect(result.isValid).toBe(false);

      // WT exists in forms -> should NOT raise an error
      const wtError = result.errors.find((e) => e.message.includes("WT"));
      expect(wtError).toBeUndefined();

      // UNKNOWN_FIELD does not exist anywhere -> should raise an UNRESOLVED_VARIABLE error
      const unknownError = result.errors.find((e) => e.type === "UNRESOLVED_VARIABLE");
      expect(unknownError).toBeDefined();
      expect(unknownError?.message).toBe(
        "Rule 'R_001' references unresolved variable/dependency 'UNKNOWN_FIELD'."
      );
    });
  });

  describe("Duplicate Definitions", () => {
    it("should flag duplicate Rule IDs", async () => {
      const r1 = makeRule("R_001", "WT > 0", RuleType.VALIDATION, undefined, 2);
      const r2 = makeRule("R_001", "HT > 0", RuleType.VALIDATION, undefined, 3);

      const result = await validateRules([r1, r2]);

      expect(result.isValid).toBe(false);
      const duplicateErrors = result.errors.filter((e) => e.type === "DUPLICATE_RULE_ID");
      expect(duplicateErrors.length).toBe(2);
      expect(duplicateErrors[0].message).toContain("Duplicate Rule ID: 'R_001'");
    });

    it("should flag duplicate derivation targets", async () => {
      const r1 = makeRule("R_001", "WT_RAW + 5", RuleType.DERIVATION, "WT", 2);
      const r2 = makeRule("R_002", "WT_EST + 1", RuleType.DERIVATION, "WT", 3);

      const result = await validateRules([r1, r2]);

      expect(result.isValid).toBe(false);
      const targetErrors = result.errors.filter((e) => e.type === "DUPLICATE_TARGET");
      expect(targetErrors.length).toBe(2);
      expect(targetErrors[0].message).toContain(
        "Duplicate Derivation Target: Variable 'WT' is derived by multiple rules"
      );
    });
  });

  describe("Master Validator Engine Integration", () => {
    it("should propagate rules errors seamlessly into validateStudyDesign issues list", async () => {
      const r1 = makeRule("R_001", "R_002");
      const r2 = makeRule("R_002", "R_001");

      const mockStudy: StudyDesign = {
        metadata: { protocolId: "P-01", studyName: "Test", version: "1.0", defaultLanguage: "en" },
        events: [],
        forms: {},
        codelists: {},
        rules: [r1, r2],
      };

      const issues = await validateStudyDesign(mockStudy);
      const cycleIssue = issues.find(
        (i) => i.sheetName === "_Rules" && i.message.includes("Circular logic loop detected")
      );

      expect(cycleIssue).toBeDefined();
      expect(cycleIssue?.level).toBe("Error");
      expect(cycleIssue?.location).toBe("Rule R_001");
      expect(cycleIssue?.sourceRowIndex).toBe(2);
    });
  });
});
