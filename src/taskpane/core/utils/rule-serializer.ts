/** @issue #440 */
import { ASTNode } from "../types";

/**
 * Transforms tree-structured rule nodes (AST) into standard logic strings.
 * This is a pure, stateless function used across validation, parsing, and building pipelines.
 *
 * @param node The AST node to serialize.
 * @returns The serialized logical string expression.
 */
export function serializeAST(node: ASTNode): string {
  if (!node) return "";
  switch (node.type) {
    case "Literal":
      if (typeof node.value === "string") return `'${node.value}'`;
      if (node.value === null) return "null";
      return String(node.value);
    case "Identifier":
      return node.name;
    case "UnaryExpression":
      return `${node.operator} ${serializeAST(node.argument)}`.trim();
    case "BinaryExpression":
      return `${serializeAST(node.left)} ${node.operator} ${serializeAST(node.right)}`;
    case "ConditionalExpression":
      return `(${serializeAST(node.test)} ? ${serializeAST(node.consequent)} : ${serializeAST(node.alternate)})`;
    case "GroupedExpression":
      return `(${serializeAST(node.expression)})`;
    case "CallExpression": {
      const callee = node.callee.toUpperCase();
      if (callee === "IF" && node.arguments.length === 3) {
        return `(${serializeAST(node.arguments[0])} ? ${serializeAST(node.arguments[1])} : ${serializeAST(node.arguments[2])})`;
      } else if (callee === "AND" && node.arguments.length > 0) {
        return `(${node.arguments.map(serializeAST).join(" && ")})`;
      } else if (callee === "OR" && node.arguments.length > 0) {
        return `(${node.arguments.map(serializeAST).join(" || ")})`;
      } else if (callee === "NOT" && node.arguments.length === 1) {
        return `!(${serializeAST(node.arguments[0])})`;
      }
      return `${node.callee}(${node.arguments.map(serializeAST).join(", ")})`;
    }
    default:
      return "";
  }
}
