/**
 * @issue #28
 */

import { parseRuleExpression } from "../rules-parser";
import { inferExpressionType, validateExpression } from "../expression-validator";
import { DataType } from "../../types/index";

describe("CRF.xl Expression static type validation & inference", () => {
  const variables = new Map<string, DataType>([
    ["WT", DataType.FLOAT],
    ["HT", DataType.FLOAT],
    ["AGE", DataType.INTEGER],
    ["SEX", DataType.TEXT],
    ["IS_ADULT", DataType.BOOLEAN],
    ["VISIT_DATE", DataType.DATE],
  ]);

  const knownRules = new Set<string>(["R_001", "R_002"]);

  describe("Type Inference", () => {
    it("should infer types for literals", () => {
      expect(inferExpressionType(parseRuleExpression("10"), variables)).toBe(DataType.INTEGER);
      expect(inferExpressionType(parseRuleExpression("1.75"), variables)).toBe(DataType.FLOAT);
      expect(inferExpressionType(parseRuleExpression("'hello'"), variables)).toBe(DataType.TEXT);
      expect(inferExpressionType(parseRuleExpression("true"), variables)).toBe(DataType.BOOLEAN);
      expect(inferExpressionType(parseRuleExpression("null"), variables)).toBe("Null");
    });

    it("should infer types for resolved variables and qualified identifiers", () => {
      expect(inferExpressionType(parseRuleExpression("WT"), variables)).toBe(DataType.FLOAT);
      expect(inferExpressionType(parseRuleExpression("AGE"), variables)).toBe(DataType.INTEGER);
      expect(inferExpressionType(parseRuleExpression("VS.WT"), variables)).toBe(DataType.FLOAT);
      expect(inferExpressionType(parseRuleExpression("VISIT_1.VS.WT"), variables)).toBe(
        DataType.FLOAT
      );
      expect(inferExpressionType(parseRuleExpression("R_001"), variables, knownRules)).toBe(
        DataType.BOOLEAN
      );
      expect(inferExpressionType(parseRuleExpression("UNKNOWN_VAR"), variables)).toBe("Unknown");
    });

    it("should infer types for unary expressions", () => {
      expect(inferExpressionType(parseRuleExpression("-WT"), variables)).toBe(DataType.FLOAT);
      expect(inferExpressionType(parseRuleExpression("!IS_ADULT"), variables)).toBe(
        DataType.BOOLEAN
      );
      expect(inferExpressionType(parseRuleExpression("not true"), variables)).toBe(
        DataType.BOOLEAN
      );
    });

    it("should infer types and promote integers to floats for binary math", () => {
      expect(inferExpressionType(parseRuleExpression("AGE + 5"), variables)).toBe(DataType.INTEGER);
      expect(inferExpressionType(parseRuleExpression("WT + 5"), variables)).toBe(DataType.FLOAT);
      expect(inferExpressionType(parseRuleExpression("AGE + 1.2"), variables)).toBe(DataType.FLOAT);
    });

    it("should infer Boolean for comparisons and logical operations", () => {
      expect(inferExpressionType(parseRuleExpression("AGE > 18"), variables)).toBe(
        DataType.BOOLEAN
      );
      expect(inferExpressionType(parseRuleExpression("SEX == 'M'"), variables)).toBe(
        DataType.BOOLEAN
      );
      expect(inferExpressionType(parseRuleExpression("IS_ADULT && true"), variables)).toBe(
        DataType.BOOLEAN
      );
    });

    it("should infer types for conditional expressions", () => {
      expect(inferExpressionType(parseRuleExpression("if IS_ADULT then 1 else 0"), variables)).toBe(
        DataType.INTEGER
      );
      expect(inferExpressionType(parseRuleExpression("IS_ADULT ? 1.5 : 2"), variables)).toBe(
        DataType.FLOAT
      );
      expect(
        inferExpressionType(parseRuleExpression("if IS_ADULT then 'Adult' else 'Child'"), variables)
      ).toBe(DataType.TEXT);
    });

    it("should infer types for curated functions", () => {
      expect(inferExpressionType(parseRuleExpression("isMissing(WT)"), variables)).toBe(
        DataType.BOOLEAN
      );
      expect(inferExpressionType(parseRuleExpression("count(WT, HT)"), variables)).toBe(
        DataType.INTEGER
      );
      expect(inferExpressionType(parseRuleExpression("concat(SEX, 'Name')"), variables)).toBe(
        DataType.TEXT
      );
      expect(inferExpressionType(parseRuleExpression("sum(AGE, 10)"), variables)).toBe(
        DataType.INTEGER
      );
      expect(inferExpressionType(parseRuleExpression("sum(WT, 10)"), variables)).toBe(
        DataType.FLOAT
      );
      expect(inferExpressionType(parseRuleExpression("mean(AGE, 10)"), variables)).toBe(
        DataType.FLOAT
      );
    });
  });

  describe("Expression Diagnostics & Safety Checks", () => {
    it("should catch unresolved variables", () => {
      const ast = parseRuleExpression("WT + UNKNOWN_FIELD");
      const diagnostics = validateExpression(ast, variables);
      expect(diagnostics.some((d) => d.type === "UNRESOLVED_VARIABLE")).toBe(true);
      expect(diagnostics[0].message).toContain("UNKNOWN_FIELD");
    });

    it("should catch type mismatches in unary operators", () => {
      const ast = parseRuleExpression("!AGE"); // Boolean NOT on numeric
      const diagnostics = validateExpression(ast, variables);
      expect(diagnostics.some((d) => d.type === "TYPE_ERROR")).toBe(true);
    });

    it("should catch type mismatches in binary operators", () => {
      const ast = parseRuleExpression("WT + 'text'");
      const diagnostics = validateExpression(ast, variables);
      expect(diagnostics.some((d) => d.type === "TYPE_ERROR")).toBe(true);
    });

    it("should catch division by zero", () => {
      const ast = parseRuleExpression("WT / 0");
      const diagnostics = validateExpression(ast, variables);
      expect(diagnostics.some((d) => d.type === "DIVISION_BY_ZERO")).toBe(true);
    });

    it("should warn about direct comparisons to Null", () => {
      const ast = parseRuleExpression("WT == null");
      const diagnostics = validateExpression(ast, variables);
      expect(diagnostics.some((d) => d.type === "NULLABILITY_WARNING")).toBe(true);
      expect(diagnostics[0].message).toContain("Use isMissing() helper function instead");
    });

    it("should catch invalid conditional expression test and branches", () => {
      const ast1 = parseRuleExpression("if WT then 1 else 0"); // non-boolean test
      const diagnostics1 = validateExpression(ast1, variables);
      expect(
        diagnostics1.some(
          (d) =>
            d.type === "TYPE_ERROR" &&
            d.message.includes("Conditional expression test must be Boolean")
        )
      ).toBe(true);

      const ast2 = parseRuleExpression("if IS_ADULT then 'adult' else 42"); // incompatible branches
      const diagnostics2 = validateExpression(ast2, variables);
      expect(
        diagnostics2.some(
          (d) => d.type === "TYPE_ERROR" && d.message.includes("branches have incompatible types")
        )
      ).toBe(true);
    });

    it("should catch arguments check and unsupported functions", () => {
      const ast1 = parseRuleExpression("isMissing(WT, HT)"); // too many arguments
      const diagnostics1 = validateExpression(ast1, variables);
      expect(
        diagnostics1.some((d) => d.type === "TYPE_ERROR" && d.message.includes("isMissing"))
      ).toBe(true);

      const ast2 = parseRuleExpression("sum(WT, 'text')"); // invalid argument type
      const diagnostics2 = validateExpression(ast2, variables);
      expect(diagnostics2.some((d) => d.type === "TYPE_ERROR" && d.message.includes("sum"))).toBe(
        true
      );

      const ast3 = parseRuleExpression("MY_MATH_FUNC(WT)"); // unsupported function
      const diagnostics3 = validateExpression(ast3, variables);
      expect(diagnostics3.some((d) => d.type === "UNSUPPORTED_FUNCTION")).toBe(true);
    });
  });
});
