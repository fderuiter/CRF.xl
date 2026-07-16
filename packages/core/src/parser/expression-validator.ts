/**
 * @issue #28
 */
import { ASTNode, DataType, SourceLocation } from "../types/index";

interface ExpressionDiagnostic {
  level: "Error" | "Warning";
  message: string;
  type:
    | "TYPE_ERROR"
    | "UNSUPPORTED_FUNCTION"
    | "NULLABILITY_WARNING"
    | "DIVISION_BY_ZERO"
    | "UNRESOLVED_VARIABLE";
  loc: SourceLocation;
}

/**
 * Checks if a type is numeric (Integer or Float).
 */
function isNumeric(type: string): boolean {
  return type === DataType.INTEGER || type === DataType.FLOAT;
}

/**
 * Infers the output type of a rule expression ASTNode.
 * Returns DataType, "Null", "Unknown", or "Any".
 */
export function inferExpressionType(
  node: ASTNode,
  variables: Map<string, DataType>,
  knownRules: Set<string> = new Set()
): DataType | "Null" | "Unknown" | "Any" {
  if (!node) return "Unknown";

  switch (node.type) {
    case "Literal": {
      if (node.value === null) return "Null";
      if (typeof node.value === "boolean") return DataType.BOOLEAN;
      if (typeof node.value === "number") {
        return node.raw.includes(".") ? DataType.FLOAT : DataType.INTEGER;
      }
      return DataType.TEXT;
    }

    case "Identifier": {
      const nameLower = node.name.toLowerCase();

      // Check exact match in variables
      if (variables.has(node.name)) {
        return variables.get(node.name)!;
      }

      // Check end segment for qualified paths (e.g. VISIT_1.VS.WT -> WT)
      let resolvedType: DataType | "Unknown" = "Unknown";
      variables.forEach((value, key) => {
        const keyLower = key.toLowerCase();
        if (keyLower === nameLower || nameLower.endsWith("." + keyLower)) {
          resolvedType = value;
        }
      });
      if (resolvedType !== "Unknown") {
        return resolvedType;
      }

      // If it matches a known rule ID (e.g. R_001), it evaluates to a boolean validation status
      let matchesRule = false;
      knownRules.forEach((r) => {
        if (r.toLowerCase() === nameLower || nameLower.endsWith("." + r.toLowerCase())) {
          matchesRule = true;
        }
      });
      if (matchesRule) {
        return DataType.BOOLEAN;
      }

      return "Unknown";
    }

    case "UnaryExpression": {
      const op = node.operator.toLowerCase();
      const argType = inferExpressionType(node.argument, variables, knownRules);

      if (op === "!" || op === "not") {
        return DataType.BOOLEAN;
      }
      if (op === "-" || op === "+") {
        if (argType === "Null") return "Null";
        return argType === DataType.INTEGER ? DataType.INTEGER : DataType.FLOAT;
      }
      return "Unknown";
    }

    case "BinaryExpression": {
      const op = node.operator.toLowerCase();
      const leftType = inferExpressionType(node.left, variables, knownRules);
      const rightType = inferExpressionType(node.right, variables, knownRules);

      // Nullability propagation: if either side is strictly Null, math evaluates to Null
      if (leftType === "Null" || rightType === "Null") {
        if (["+", "-", "*", "/", "%"].includes(op)) {
          return "Null";
        }
      }

      if (["+", "-", "*", "/", "%"].includes(op)) {
        if (leftType === DataType.FLOAT || rightType === DataType.FLOAT) {
          return DataType.FLOAT;
        }
        return DataType.INTEGER;
      }

      if (["&&", "||", "and", "or"].includes(op)) {
        return DataType.BOOLEAN;
      }

      if (["==", "!=", "<>", "<", "<=", ">", ">="].includes(op)) {
        return DataType.BOOLEAN;
      }

      return "Unknown";
    }

    case "ConditionalExpression": {
      const consequentType = inferExpressionType(node.consequent, variables, knownRules);
      const alternateType = inferExpressionType(node.alternate, variables, knownRules);

      if (consequentType === alternateType) return consequentType;

      // Compatibility checks
      if (consequentType === "Null") return alternateType;
      if (alternateType === "Null") return consequentType;

      if (isNumeric(consequentType) && isNumeric(alternateType)) {
        return DataType.FLOAT; // Coerce mixed numbers to float
      }

      return "Any";
    }

    case "CallExpression": {
      const callee = node.callee.toLowerCase();
      switch (callee) {
        case "ismissing":
          return DataType.BOOLEAN;
        case "count":
          return DataType.INTEGER;
        case "concat":
          return DataType.TEXT;
        case "sum":
        case "min":
        case "max": {
          if (!node.arguments || node.arguments.length === 0) return DataType.FLOAT;
          const argTypes = node.arguments.map((arg) =>
            inferExpressionType(arg, variables, knownRules)
          );
          if (argTypes.some((t) => t === DataType.FLOAT)) {
            return DataType.FLOAT;
          }
          return DataType.INTEGER;
        }
        case "mean":
          return DataType.FLOAT;
        default:
          return "Unknown";
      }
    }

    case "GroupedExpression":
      return inferExpressionType(node.expression, variables, knownRules);

    default:
      return "Unknown";
  }
}

/**
 * Validates an ASTNode against known variables and rules.
 * Generates an array of structured ExpressionDiagnostic issues.
 */
export function validateExpression(
  node: ASTNode,
  variables: Map<string, DataType>,
  knownRules: Set<string> = new Set()
): ExpressionDiagnostic[] {
  const diagnostics: ExpressionDiagnostic[] = [];

  function traverse(n: ASTNode) {
    if (!n) return;

    switch (n.type) {
      case "Identifier": {
        const nameLower = n.name.toLowerCase();
        let found = variables.has(n.name);
        if (!found) {
          variables.forEach((_, key) => {
            const keyLower = key.toLowerCase();
            if (keyLower === nameLower || nameLower.endsWith("." + keyLower)) {
              found = true;
            }
          });
        }
        if (!found) {
          knownRules.forEach((r) => {
            const rLower = r.toLowerCase();
            if (rLower === nameLower || nameLower.endsWith("." + rLower)) {
              found = true;
            }
          });
        }

        if (!found) {
          diagnostics.push({
            level: "Error",
            message: `Unresolved variable reference '${n.name}'.`,
            type: "UNRESOLVED_VARIABLE",
            loc: n.loc,
          });
        }
        break;
      }

      case "UnaryExpression": {
        const op = n.operator.toLowerCase();
        traverse(n.argument);
        const argType = inferExpressionType(n.argument, variables, knownRules);

        if (op === "!" || op === "not") {
          if (argType !== DataType.BOOLEAN && argType !== "Unknown" && argType !== "Any") {
            diagnostics.push({
              level: "Error",
              message: `Operator '${n.operator}' requires a Boolean operand, but got ${argType}.`,
              type: "TYPE_ERROR",
              loc: n.loc,
            });
          }
        } else if (op === "-" || op === "+") {
          if (
            !isNumeric(argType) &&
            argType !== "Null" &&
            argType !== "Unknown" &&
            argType !== "Any"
          ) {
            diagnostics.push({
              level: "Error",
              message: `Operator '${n.operator}' requires a numeric operand, but got ${argType}.`,
              type: "TYPE_ERROR",
              loc: n.loc,
            });
          }
        }
        break;
      }

      case "BinaryExpression": {
        const op = n.operator.toLowerCase();
        traverse(n.left);
        traverse(n.right);

        const leftType = inferExpressionType(n.left, variables, knownRules);
        const rightType = inferExpressionType(n.right, variables, knownRules);

        if (["+", "-", "*", "/", "%"].includes(op)) {
          // Numeric check
          const leftOk =
            isNumeric(leftType) ||
            leftType === "Null" ||
            leftType === "Unknown" ||
            leftType === "Any";
          const rightOk =
            isNumeric(rightType) ||
            rightType === "Null" ||
            rightType === "Unknown" ||
            rightType === "Any";

          if (!leftOk || !rightOk) {
            diagnostics.push({
              level: "Error",
              message: `Operator '${n.operator}' requires numeric operands, but got ${leftType} and ${rightType}.`,
              type: "TYPE_ERROR",
              loc: n.loc,
            });
          }

          // Division by zero check
          if (op === "/") {
            if (n.right.type === "Literal" && n.right.value === 0) {
              diagnostics.push({
                level: "Error",
                message: "Division by zero.",
                type: "DIVISION_BY_ZERO",
                loc: n.loc,
              });
            }
          }
        } else if (["&&", "||", "and", "or"].includes(op)) {
          const leftOk =
            leftType === DataType.BOOLEAN || leftType === "Unknown" || leftType === "Any";
          const rightOk =
            rightType === DataType.BOOLEAN || rightType === "Unknown" || rightType === "Any";

          if (!leftOk || !rightOk) {
            diagnostics.push({
              level: "Error",
              message: `Logical operator '${n.operator}' requires Boolean operands, but got ${leftType} and ${rightType}.`,
              type: "TYPE_ERROR",
              loc: n.loc,
            });
          }
        } else if (["<", "<=", ">", ">="].includes(op)) {
          // Relational check
          const leftNumeric = isNumeric(leftType) || leftType === "Unknown" || leftType === "Any";
          const rightNumeric =
            isNumeric(rightType) || rightType === "Unknown" || rightType === "Any";

          const leftDate =
            leftType === DataType.DATE ||
            leftType === DataType.DATETIME ||
            leftType === DataType.TIME;
          const rightDate =
            rightType === DataType.DATE ||
            rightType === DataType.DATETIME ||
            rightType === DataType.TIME;

          const leftText = leftType === DataType.TEXT;
          const rightText = rightType === DataType.TEXT;

          const compatible =
            (leftNumeric && rightNumeric) || (leftDate && rightDate) || (leftText && rightText);

          if (
            !compatible &&
            leftType !== "Unknown" &&
            rightType !== "Unknown" &&
            leftType !== "Any" &&
            rightType !== "Any"
          ) {
            diagnostics.push({
              level: "Error",
              message: `Comparison '${n.operator}' is not valid between types ${leftType} and ${rightType}.`,
              type: "TYPE_ERROR",
              loc: n.loc,
            });
          }

          if (leftType === "Null" || rightType === "Null") {
            diagnostics.push({
              level: "Warning",
              message: `Comparison '${n.operator}' against Null always evaluates to Null. Use isMissing() instead.`,
              type: "NULLABILITY_WARNING",
              loc: n.loc,
            });
          }
        } else if (["==", "!=", "<>"].includes(op)) {
          // Equality check
          if (n.left.type === "Literal" && n.left.value === null) {
            diagnostics.push({
              level: "Warning",
              message: "Direct comparison to Null. Use isMissing() helper function instead.",
              type: "NULLABILITY_WARNING",
              loc: n.loc,
            });
          } else if (n.right.type === "Literal" && n.right.value === null) {
            diagnostics.push({
              level: "Warning",
              message: "Direct comparison to Null. Use isMissing() helper function instead.",
              type: "NULLABILITY_WARNING",
              loc: n.loc,
            });
          } else {
            // Check compatible types
            const leftNumeric = isNumeric(leftType);
            const rightNumeric = isNumeric(rightType);
            const leftText = leftType === DataType.TEXT;
            const rightText = rightType === DataType.TEXT;
            const leftBool = leftType === DataType.BOOLEAN;
            const rightBool = rightType === DataType.BOOLEAN;

            // Flag extreme incompatible types
            if (
              (leftNumeric && rightText) ||
              (rightNumeric && leftText) ||
              (leftBool && leftText) ||
              (rightBool && rightText)
            ) {
              diagnostics.push({
                level: "Warning",
                message: `Comparing potentially incompatible types ${leftType} and ${rightType}.`,
                type: "TYPE_ERROR",
                loc: n.loc,
              });
            }
          }
        }
        break;
      }

      case "ConditionalExpression": {
        traverse(n.test);
        traverse(n.consequent);
        traverse(n.alternate);

        const testType = inferExpressionType(n.test, variables, knownRules);
        const consequentType = inferExpressionType(n.consequent, variables, knownRules);
        const alternateType = inferExpressionType(n.alternate, variables, knownRules);

        if (testType !== DataType.BOOLEAN && testType !== "Unknown" && testType !== "Any") {
          diagnostics.push({
            level: "Error",
            message: `Conditional expression test must be Boolean, but got ${testType}.`,
            type: "TYPE_ERROR",
            loc: n.test.loc,
          });
        }

        // Branch type checking
        const bothNumeric = isNumeric(consequentType) && isNumeric(alternateType);
        const compatible =
          consequentType === alternateType ||
          consequentType === "Null" ||
          alternateType === "Null" ||
          consequentType === "Unknown" ||
          alternateType === "Unknown" ||
          consequentType === "Any" ||
          alternateType === "Any" ||
          bothNumeric;

        if (!compatible) {
          diagnostics.push({
            level: "Error",
            message: `Conditional branches have incompatible types: '${consequentType}' and '${alternateType}'.`,
            type: "TYPE_ERROR",
            loc: n.loc,
          });
        }
        break;
      }

      case "CallExpression": {
        const callee = n.callee.toLowerCase();
        if (n.arguments) {
          n.arguments.forEach(traverse);
        }

        const args = n.arguments || [];

        switch (callee) {
          case "ismissing": {
            if (args.length !== 1) {
              diagnostics.push({
                level: "Error",
                message: "Function 'isMissing' requires exactly 1 argument.",
                type: "TYPE_ERROR",
                loc: n.loc,
              });
            }
            break;
          }
          case "sum":
          case "mean":
          case "min":
          case "max": {
            if (args.length === 0) {
              diagnostics.push({
                level: "Error",
                message: `Function '${n.callee}' requires at least 1 argument.`,
                type: "TYPE_ERROR",
                loc: n.loc,
              });
            }
            args.forEach((arg) => {
              const argType = inferExpressionType(arg, variables, knownRules);
              if (
                !isNumeric(argType) &&
                argType !== "Null" &&
                argType !== "Unknown" &&
                argType !== "Any"
              ) {
                diagnostics.push({
                  level: "Error",
                  message: `Function '${n.callee}' requires numeric arguments, but got ${argType}.`,
                  type: "TYPE_ERROR",
                  loc: arg.loc,
                });
              }
            });
            break;
          }
          case "count": {
            if (args.length === 0) {
              diagnostics.push({
                level: "Error",
                message: "Function 'count' requires at least 1 argument.",
                type: "TYPE_ERROR",
                loc: n.loc,
              });
            }
            break;
          }
          case "concat": {
            if (args.length === 0) {
              diagnostics.push({
                level: "Error",
                message: "Function 'concat' requires at least 1 argument.",
                type: "TYPE_ERROR",
                loc: n.loc,
              });
            }
            args.forEach((arg) => {
              const argType = inferExpressionType(arg, variables, knownRules);
              if (
                argType !== DataType.TEXT &&
                argType !== "Null" &&
                argType !== "Unknown" &&
                argType !== "Any"
              ) {
                diagnostics.push({
                  level: "Error",
                  message: `Function 'concat' requires text arguments, but got ${argType}.`,
                  type: "TYPE_ERROR",
                  loc: arg.loc,
                });
              }
            });
            break;
          }
          default: {
            diagnostics.push({
              level: "Error",
              message: `Function '${n.callee}' is unsupported. Curated functions: isMissing, sum, mean, min, max, count, concat.`,
              type: "UNSUPPORTED_FUNCTION",
              loc: n.loc,
            });
          }
        }
        break;
      }

      case "GroupedExpression":
        traverse(n.expression);
        break;
    }
  }

  traverse(node);
  return diagnostics;
}
