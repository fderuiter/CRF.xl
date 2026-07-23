/**
 * @issue #44, #139, #28
 */
import { serializeAST } from "../rule-serializer";
import { ASTNode } from "../../types";

describe("Rule Serializer Utility (serializeAST)", () => {
  it("should return empty string for null or undefined nodes", () => {
    expect(serializeAST(null as any)).toBe("");
    expect(serializeAST(undefined as any)).toBe("");
  });

  describe("Literal Nodes", () => {
    it("should serialize string literals with single quotes", () => {
      const node: ASTNode = {
        type: "Literal",
        value: "hello",
        raw: "'hello'",
        loc: {} as any,
      };
      expect(serializeAST(node)).toBe("'hello'");
    });

    it("should serialize numeric literals as string representation", () => {
      const node: ASTNode = {
        type: "Literal",
        value: 123.45,
        raw: "123.45",
        loc: {} as any,
      };
      expect(serializeAST(node)).toBe("123.45");
    });

    it("should serialize boolean literals", () => {
      const nodeTrue: ASTNode = {
        type: "Literal",
        value: true,
        raw: "true",
        loc: {} as any,
      };
      const nodeFalse: ASTNode = {
        type: "Literal",
        value: false,
        raw: "false",
        loc: {} as any,
      };
      expect(serializeAST(nodeTrue)).toBe("true");
      expect(serializeAST(nodeFalse)).toBe("false");
    });

    it("should serialize null literals", () => {
      const node: ASTNode = {
        type: "Literal",
        value: null,
        raw: "null",
        loc: {} as any,
      };
      expect(serializeAST(node)).toBe("null");
    });
  });

  describe("Identifier Nodes", () => {
    it("should serialize identifier names", () => {
      const node: ASTNode = {
        type: "Identifier",
        name: "VS.WT",
        loc: {} as any,
      };
      expect(serializeAST(node)).toBe("VS.WT");
    });
  });

  describe("UnaryExpression Nodes", () => {
    it("should serialize unary operators and their arguments", () => {
      const node: ASTNode = {
        type: "UnaryExpression",
        operator: "-",
        argument: {
          type: "Identifier",
          name: "AGE",
          loc: {} as any,
        },
        loc: {} as any,
      };
      expect(serializeAST(node)).toBe("- AGE");
    });

    it("should trim unary expressions", () => {
      const node: ASTNode = {
        type: "UnaryExpression",
        operator: "",
        argument: {
          type: "Identifier",
          name: "AGE",
          loc: {} as any,
        },
        loc: {} as any,
      };
      expect(serializeAST(node)).toBe("AGE");
    });
  });

  describe("BinaryExpression Nodes", () => {
    it("should serialize binary operations recursively", () => {
      const node: ASTNode = {
        type: "BinaryExpression",
        operator: "+",
        left: {
          type: "Identifier",
          name: "SYSBP",
          loc: {} as any,
        },
        right: {
          type: "Identifier",
          name: "DIABP",
          loc: {} as any,
        },
        loc: {} as any,
      };
      expect(serializeAST(node)).toBe("SYSBP + DIABP");
    });
  });

  describe("ConditionalExpression Nodes", () => {
    it("should serialize conditional (ternary) expressions with parentheses", () => {
      const node: ASTNode = {
        type: "ConditionalExpression",
        test: {
          type: "Identifier",
          name: "FLAG",
          loc: {} as any,
        },
        consequent: {
          type: "Literal",
          value: 1,
          raw: "1",
          loc: {} as any,
        },
        alternate: {
          type: "Literal",
          value: 0,
          raw: "0",
          loc: {} as any,
        },
        loc: {} as any,
      };
      expect(serializeAST(node)).toBe("(FLAG ? 1 : 0)");
    });
  });

  describe("GroupedExpression Nodes", () => {
    it("should wrap grouped expressions with parentheses", () => {
      const node: ASTNode = {
        type: "GroupedExpression",
        expression: {
          type: "BinaryExpression",
          operator: "*",
          left: {
            type: "Identifier",
            name: "A",
            loc: {} as any,
          },
          right: {
            type: "Identifier",
            name: "B",
            loc: {} as any,
          },
          loc: {} as any,
        },
        loc: {} as any,
      };
      expect(serializeAST(node)).toBe("(A * B)");
    });
  });

  describe("CallExpression Nodes", () => {
    it("should serialize custom function calls", () => {
      const node: ASTNode = {
        type: "CallExpression",
        callee: "mean",
        arguments: [
          { type: "Identifier", name: "A", loc: {} as any },
          { type: "Identifier", name: "B", loc: {} as any },
        ],
        loc: {} as any,
      };
      expect(serializeAST(node)).toBe("mean(A, B)");
    });

    it("should serialize IF function calls as ternary operator", () => {
      const node: ASTNode = {
        type: "CallExpression",
        callee: "IF",
        arguments: [
          { type: "Identifier", name: "test", loc: {} as any },
          { type: "Identifier", name: "yes", loc: {} as any },
          { type: "Identifier", name: "no", loc: {} as any },
        ],
        loc: {} as any,
      };
      expect(serializeAST(node)).toBe("(test ? yes : no)");
    });

    it("should fall back to standard call expression if IF does not have 3 arguments", () => {
      const node: ASTNode = {
        type: "CallExpression",
        callee: "IF",
        arguments: [
          { type: "Identifier", name: "test", loc: {} as any },
          { type: "Identifier", name: "yes", loc: {} as any },
        ],
        loc: {} as any,
      };
      expect(serializeAST(node)).toBe("IF(test, yes)");
    });

    it("should serialize AND function calls with '&&' operator and parenthesize", () => {
      const node: ASTNode = {
        type: "CallExpression",
        callee: "AND",
        arguments: [
          { type: "Identifier", name: "A", loc: {} as any },
          { type: "Identifier", name: "B", loc: {} as any },
          { type: "Identifier", name: "C", loc: {} as any },
        ],
        loc: {} as any,
      };
      expect(serializeAST(node)).toBe("(A && B && C)");
    });

    it("should serialize OR function calls with '||' operator and parenthesize", () => {
      const node: ASTNode = {
        type: "CallExpression",
        callee: "OR",
        arguments: [
          { type: "Identifier", name: "A", loc: {} as any },
          { type: "Identifier", name: "B", loc: {} as any },
        ],
        loc: {} as any,
      };
      expect(serializeAST(node)).toBe("(A || B)");
    });

    it("should serialize NOT function calls with '!' operator and parenthesize", () => {
      const node: ASTNode = {
        type: "CallExpression",
        callee: "NOT",
        arguments: [{ type: "Identifier", name: "A", loc: {} as any }],
        loc: {} as any,
      };
      expect(serializeAST(node)).toBe("!(A)");
    });

    it("should fall back to standard call expression if NOT does not have exactly 1 argument", () => {
      const node: ASTNode = {
        type: "CallExpression",
        callee: "NOT",
        arguments: [
          { type: "Identifier", name: "A", loc: {} as any },
          { type: "Identifier", name: "B", loc: {} as any },
        ],
        loc: {} as any,
      };
      expect(serializeAST(node)).toBe("NOT(A, B)");
    });
  });

  describe("Fallback / Default Handling", () => {
    it("should return empty string for unknown node types", () => {
      const node = {
        type: "UnknownType",
      };
      expect(serializeAST(node as any)).toBe("");
    });
  });
});
