/**
 * @issue #28
 */
/* eslint-disable no-undef */
import { tokenize, parseRuleExpression, parseRulesSheetRows } from "../rules-parser";
import { ParseError, RuleType } from "../../types/index";

describe("CRF.xl Rules Lexer & Tokenizer", () => {
  it("should tokenize number literals (integers and decimals)", () => {
    const tokens = tokenize("100 4.56");
    expect(tokens.length).toBe(3); // 100, 4.56, EOF
    expect(tokens[0]).toMatchObject({ type: "NUMBER", value: "100" });
    expect(tokens[1]).toMatchObject({ type: "NUMBER", value: "4.56" });
  });

  it("should tokenize single and double quoted string literals", () => {
    const tokens = tokenize("'Male' \"Female\"");
    expect(tokens.length).toBe(3);
    expect(tokens[0]).toMatchObject({ type: "STRING", value: "Male" });
    expect(tokens[1]).toMatchObject({ type: "STRING", value: "Female" });
  });

  it("should support escaped quotes in string literals", () => {
    const tokens = tokenize('\'It\\\'s correct\' "a \\"double\\" quote"');
    expect(tokens.length).toBe(3);
    expect(tokens[0]).toMatchObject({ type: "STRING", value: "It's correct" });
    expect(tokens[1]).toMatchObject({ type: "STRING", value: 'a "double" quote' });
  });

  it("should throw ParseError on unclosed string literals", () => {
    expect(() => tokenize("'unclosed")).toThrow(ParseError);
    expect(() => tokenize('"unclosed')).toThrow(ParseError);
  });

  it("should tokenize identifiers including dot-separated paths", () => {
    const tokens = tokenize("WT VS.WT VISIT_1.VS.WT");
    expect(tokens.length).toBe(4);
    expect(tokens[0]).toMatchObject({ type: "IDENTIFIER", value: "WT" });
    expect(tokens[1]).toMatchObject({ type: "IDENTIFIER", value: "VS.WT" });
    expect(tokens[2]).toMatchObject({ type: "IDENTIFIER", value: "VISIT_1.VS.WT" });
  });

  it("should tokenize operators and punctuation", () => {
    const tokens = tokenize("== != <= >= <> && || + - * / % ? : ( ) ,");
    const operators = tokens.filter(
      (t) =>
        t.type === "OPERATOR" || t.type === "LPAREN" || t.type === "RPAREN" || t.type === "COMMA"
    );
    expect(operators.map((o) => o.value)).toEqual([
      "==",
      "!=",
      "<=",
      ">=",
      "<>",
      "&&",
      "||",
      "+",
      "-",
      "*",
      "/",
      "%",
      "?",
      ":",
      "(",
      ")",
      ",",
    ]);
  });

  it("should distinguish keywords, word operators, booleans, and nulls", () => {
    const tokens = tokenize("if then else and or not true false null");
    expect(tokens[0]).toMatchObject({ type: "KEYWORD", value: "if" });
    expect(tokens[1]).toMatchObject({ type: "KEYWORD", value: "then" });
    expect(tokens[2]).toMatchObject({ type: "KEYWORD", value: "else" });
    expect(tokens[3]).toMatchObject({ type: "OPERATOR", value: "and" });
    expect(tokens[4]).toMatchObject({ type: "OPERATOR", value: "or" });
    expect(tokens[5]).toMatchObject({ type: "OPERATOR", value: "not" });
    expect(tokens[6]).toMatchObject({ type: "BOOLEAN", value: "true" });
    expect(tokens[7]).toMatchObject({ type: "BOOLEAN", value: "false" });
    expect(tokens[8]).toMatchObject({ type: "NULL", value: "null" });
  });

  it("should track precise character offsets, lines, and columns", () => {
    const tokens = tokenize("WT\n  + 5");
    // WT
    expect(tokens[0].start).toEqual({ offset: 0, line: 1, column: 1 });
    expect(tokens[0].end).toEqual({ offset: 2, line: 1, column: 3 });

    // +
    expect(tokens[1].start).toEqual({ offset: 5, line: 2, column: 3 });
    expect(tokens[1].end).toEqual({ offset: 6, line: 2, column: 4 });

    // 5
    expect(tokens[2].start).toEqual({ offset: 7, line: 2, column: 5 });
    expect(tokens[2].end).toEqual({ offset: 8, line: 2, column: 6 });
  });

  it("should throw ParseError on unexpected characters", () => {
    expect(() => tokenize("WT @ 10")).toThrow("Unexpected character: '@'");
  });
});

describe("CRF.xl Rules Parser & AST Generator", () => {
  it("should parse literals", () => {
    expect(parseRuleExpression("42")).toMatchObject({
      type: "Literal",
      value: 42,
      raw: "42",
    });

    expect(parseRuleExpression("'hello'")).toMatchObject({
      type: "Literal",
      value: "hello",
      raw: '"hello"',
    });

    expect(parseRuleExpression("true")).toMatchObject({
      type: "Literal",
      value: true,
      raw: "true",
    });

    expect(parseRuleExpression("null")).toMatchObject({
      type: "Literal",
      value: null,
      raw: "null",
    });
  });

  it("should parse identifiers", () => {
    expect(parseRuleExpression("WT")).toMatchObject({
      type: "Identifier",
      name: "WT",
    });
  });

  it("should parse unary expressions", () => {
    expect(parseRuleExpression("-WT")).toMatchObject({
      type: "UnaryExpression",
      operator: "-",
      argument: { type: "Identifier", name: "WT" },
    });

    expect(parseRuleExpression("not true")).toMatchObject({
      type: "UnaryExpression",
      operator: "!",
      argument: { type: "Literal", value: true },
    });
  });

  it("should parse binary expressions", () => {
    expect(parseRuleExpression("WT > 50")).toMatchObject({
      type: "BinaryExpression",
      operator: ">",
      left: { type: "Identifier", name: "WT" },
      right: { type: "Literal", value: 50 },
    });

    expect(parseRuleExpression("A <> B")).toMatchObject({
      type: "BinaryExpression",
      operator: "!=",
      left: { type: "Identifier", name: "A" },
      right: { type: "Identifier", name: "B" },
    });
  });

  it("should parse function calls", () => {
    const call = parseRuleExpression("mean(WT, HT)");
    expect(call).toMatchObject({
      type: "CallExpression",
      callee: "mean",
    });
    expect((call as any).arguments.length).toBe(2);
    expect((call as any).arguments[0]).toMatchObject({ type: "Identifier", name: "WT" });
    expect((call as any).arguments[1]).toMatchObject({ type: "Identifier", name: "HT" });

    // Empty argument call
    const emptyCall = parseRuleExpression("foo()");
    expect(emptyCall).toMatchObject({
      type: "CallExpression",
      callee: "foo",
      arguments: [],
    });
  });

  it("should parse parenthesized grouped expressions", () => {
    const grouped = parseRuleExpression("(WT + HT)");
    expect(grouped).toMatchObject({
      type: "GroupedExpression",
      expression: {
        type: "BinaryExpression",
        operator: "+",
      },
    });
  });

  it("should parse ternary conditional expressions", () => {
    const ternary = parseRuleExpression("AGE >= 18 ? 'Adult' : 'Minor'");
    expect(ternary).toMatchObject({
      type: "ConditionalExpression",
      test: { type: "BinaryExpression", operator: ">=" },
      consequent: { type: "Literal", value: "Adult" },
      alternate: { type: "Literal", value: "Minor" },
    });
  });

  it("should parse block If-Then-Else conditional expressions", () => {
    const block = parseRuleExpression("if AGE >= 18 then 'Adult' else 'Minor'");
    expect(block).toMatchObject({
      type: "ConditionalExpression",
      test: { type: "BinaryExpression", operator: ">=" },
      consequent: { type: "Literal", value: "Adult" },
      alternate: { type: "Literal", value: "Minor" },
    });
  });

  it("should enforce standard operator precedence", () => {
    // Multiplicative higher than Additive
    const mulAdd = parseRuleExpression("A + B * C");
    expect(mulAdd).toMatchObject({
      type: "BinaryExpression",
      operator: "+",
      left: { type: "Identifier", name: "A" },
      right: {
        type: "BinaryExpression",
        operator: "*",
        left: { type: "Identifier", name: "B" },
        right: { type: "Identifier", name: "C" },
      },
    });

    // Unary higher than Logical AND, AND higher than OR
    const precedence = parseRuleExpression("not A and B or C");
    expect(precedence).toMatchObject({
      type: "BinaryExpression",
      operator: "||",
      left: {
        type: "BinaryExpression",
        operator: "&&",
        left: {
          type: "UnaryExpression",
          operator: "!",
          argument: { type: "Identifier", name: "A" },
        },
        right: { type: "Identifier", name: "B" },
      },
      right: { type: "Identifier", name: "C" },
    });
  });

  it("should attach precise source location spans to all AST nodes", () => {
    const ast = parseRuleExpression("WT + 5");
    expect(ast.loc).toBeDefined();
    expect(ast.loc.start).toEqual({ offset: 0, line: 1, column: 1 });
    expect(ast.loc.end).toEqual({ offset: 6, line: 1, column: 7 });

    const binary = ast as any;
    expect(binary.left.loc.start).toEqual({ offset: 0, line: 1, column: 1 });
    expect(binary.left.loc.end).toEqual({ offset: 2, line: 1, column: 3 });

    expect(binary.right.loc.start).toEqual({ offset: 5, line: 1, column: 6 });
    expect(binary.right.loc.end).toEqual({ offset: 6, line: 1, column: 7 });
  });

  it("should throw ParseError on malformed syntax with exact location", () => {
    // Unclosed parenthesis
    expect(() => parseRuleExpression("(WT + 5")).toThrow("Expected ')' after expression. (1:8)");

    // Missing then in IF
    expect(() => parseRuleExpression("if AGE > 18 'Adult' else 'Minor'")).toThrow(
      "Expected 'then' after if condition. (1:13)"
    );

    // Missing else in IF
    expect(() => parseRuleExpression("if AGE > 18 then 'Adult'")).toThrow(
      "Expected 'else' after then branch."
    );

    // Trailing unrecognized tokens
    expect(() => parseRuleExpression("WT + 5 )")).toThrow("Unexpected extra token: ')'");
  });
});

describe("CRF.xl _Rules Sheet Ingestion", () => {
  it("should parse valid workbook sheet rows", () => {
    const mockRows = [
      ["Rule ID", "Rule Name", "Rule Type", "Target", "Expression", "Error Message", "Description"],
      [
        "R_001",
        "Weight Range",
        "VALIDATION",
        "WT",
        "WT > 0 && WT < 300",
        "Weight out of range",
        "Verify weight is logical",
      ],
      ["R_002", "Compute BMI", "Derivation", "BMI", "WT / (HT * HT)", "", "BMI calculation"],
      [
        "R_003",
        "Show If Pregnant",
        "show_if",
        "PREG",
        "SEX == 'F'",
        "",
        "Conditional pregnancy check",
      ],
    ];

    const { rules, errors } = parseRulesSheetRows(mockRows, "1.0");

    expect(errors.length).toBe(0);
    expect(rules.length).toBe(3);

    expect(rules[0]).toMatchObject({
      ruleId: "R_001",
      name: "Weight Range",
      ruleType: RuleType.VALIDATION,
      target: "WT",
      expression: "WT > 0 && WT < 300",
      errorMessage: "Weight out of range",
      description: "Verify weight is logical",
    });
    expect(rules[0].ast).toBeDefined();
    expect(rules[0].ast?.type).toBe("BinaryExpression");

    expect(rules[1]).toMatchObject({
      ruleId: "R_002",
      name: "Compute BMI",
      ruleType: RuleType.DERIVATION,
      target: "BMI",
      expression: "WT / (HT * HT)",
    });

    expect(rules[2]).toMatchObject({
      ruleId: "R_003",
      ruleType: RuleType.SHOW_IF,
      target: "PREG",
      expression: "SEX == 'F'",
    });
  });

  it("should capture and report structured parse errors on malformed rows without crashing", () => {
    const mockRows = [
      ["Rule ID", "Expression"],
      ["R_001", "WT + * 5"], // syntax error
      ["R_002", ""], // missing expression
      ["", "WT > 0"], // empty rule ID
    ];

    const { rules, errors } = parseRulesSheetRows(mockRows, "1.0");

    // R_001 parses but has a parseError message on the rule definition and returns an error
    expect(rules.length).toBe(1); // R_001 gets added (since it has ID + Expr) but holds parseError
    expect(rules[0].ruleId).toBe("R_001");
    expect(rules[0].parseError).toBeDefined();
    expect(rules[0].ast).toBeUndefined();

    // 2 errors reported: syntax error in R_001, missing expression in R_002
    expect(errors.length).toBe(2);
    expect(errors[0].message).toContain(
      "Rule 'R_001' parse error: Expected expression, found token: '*'"
    );
    expect(errors[0].line).toBe(2); // row index 2

    expect(errors[1].message).toContain("Rule 'R_002' is missing an expression.");
    expect(errors[1].line).toBe(3); // row index 3
  });
});
