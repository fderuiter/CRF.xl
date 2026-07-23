/**
 * @issue #138
 */
/**
 * ============================================================================
 * dag-validator.ts
 * ============================================================================
 * Dependency Graph Validator and Topological Sorter for CRF.xl Rules.
 */

import {
  ASTNode,
  RuleDefinition,
  RuleType,
  StudyDesign,
  DataType,
  isCrfItem,
} from "../types/index";
import { validateExpression, inferExpressionType } from "./expression-validator";
import { normalizeOid } from "./metadata-utils";

export interface RuleValidationError {
  level: "Error" | "Warning";
  ruleId: string;
  message: string;
  type:
    | "CYCLE"
    | "BROKEN_REFERENCE"
    | "PARSE_ERROR"
    | "DUPLICATE_RULE_ID"
    | "DUPLICATE_TARGET"
    | "UNRESOLVED_VARIABLE"
    | "TYPE_ERROR"
    | "UNSUPPORTED_FUNCTION"
    | "NULLABILITY_WARNING"
    | "DIVISION_BY_ZERO";
  cyclePath?: string[];
  actionableExplanation?: string;
  rowIndex?: number;
}

interface RuleValidationResult {
  isValid: boolean;
  errors: RuleValidationError[];
  topologicalOrder: string[];
  dependencyMap: Record<string, string[]>;
}

function evaluateStaticCondition(node: ASTNode): boolean | null {
  if (!node) return null;

  // Since static evaluation of small expressions is typically not deep enough to cause stack overflows,
  // we can use a bottom-up iterative post-order traversal to be perfectly safe, or just keep it simple.
  // We'll refactor it to an iterative approach using a stack.

  const postOrder: ASTNode[] = [];
  const stack = [node];
  while (stack.length > 0) {
    const curr = stack.pop();
    if (!curr) continue;
    postOrder.push(curr);

    if (curr.type === "UnaryExpression") {
      stack.push(curr.argument);
    } else if (curr.type === "BinaryExpression") {
      stack.push(curr.left);
      stack.push(curr.right);
    } else if (curr.type === "GroupedExpression") {
      stack.push(curr.expression);
    }
  }

  // We have nodes in roughly top-down order. Let's reverse for bottom-up.
  postOrder.reverse();

  const results = new Map<ASTNode, boolean | null>();

  for (const n of postOrder) {
    if (n.type === "Literal") {
      let val: boolean | null = null;
      if (typeof n.value === "boolean") val = n.value;
      else if (typeof n.value === "number") val = n.value !== 0;
      else if (typeof n.value === "string") val = n.value.length > 0;
      else if (n.value === null) val = false;
      results.set(n, val);
    } else if (n.type === "UnaryExpression") {
      const arg = results.get(n.argument) ?? null;
      if (arg !== null && (n.operator === "!" || n.operator.toLowerCase() === "not")) {
        results.set(n, !arg);
      } else {
        results.set(n, null);
      }
    } else if (n.type === "BinaryExpression") {
      const left = results.get(n.left) ?? null;
      const right = results.get(n.right) ?? null;
      let val: boolean | null = null;
      if (n.operator === "&&" || n.operator.toLowerCase() === "and") {
        if (left === false || right === false) val = false;
        else if (left === true && right === true) val = true;
      } else if (n.operator === "||" || n.operator.toLowerCase() === "or") {
        if (left === true || right === true) val = true;
        else if (left === false && right === false) val = false;
      }
      results.set(n, val);
    } else if (n.type === "GroupedExpression") {
      results.set(n, results.get(n.expression) ?? null);
    } else {
      results.set(n, null);
    }
  }

  return results.get(node) ?? null;
}

/**
 * Traverses an ASTNode to collect all unique Identifier names referenced in the expression.
 * @param node
 * @returns
 */
export function collectIdentifiers(node: ASTNode): string[] {
  const idents = new Set<string>();

  const stack: ASTNode[] = [node];

  while (stack.length > 0) {
    const n = stack.pop();
    if (!n) continue;

    switch (n.type) {
      case "Identifier":
        idents.add(n.name);
        break;
      case "UnaryExpression":
        stack.push(n.argument);
        break;
      case "BinaryExpression":
        stack.push(n.right);
        stack.push(n.left);
        break;
      case "ConditionalExpression":
        stack.push(n.test);
        const testEval = evaluateStaticCondition(n.test);
        if (testEval === true) {
          stack.push(n.consequent);
        } else if (testEval === false) {
          stack.push(n.alternate);
        } else {
          stack.push(n.alternate);
          stack.push(n.consequent);
        }
        break;
      case "CallExpression":
        if (n.arguments) {
          for (let i = n.arguments.length - 1; i >= 0; i--) {
            stack.push(n.arguments[i]);
          }
        }
        break;
      case "GroupedExpression":
        stack.push(n.expression);
        break;
      case "Literal":
        break;
    }
  }

  return Array.from(idents);
}

/**
 * Checks if an identifier matches a reference (case-insensitively).
 * Matches either the exact name or the final dot-separated segment.
 * E.g., "VS.WT" matches "WT", and "VISIT_1.VS.WT" matches "WT".
 * @param identifier
 * @param ref
 * @returns
 */
function matchesRef(identifier: string, ref: string): boolean {
  const normIdentifier = normalizeOid(identifier).toLowerCase();
  const normRef = normalizeOid(ref).toLowerCase();
  if (normIdentifier === normRef) return true;
  return normIdentifier.endsWith("." + normRef);
}

/**
 * Validates a dependency graph of rules, checks for cycles and broken references,
 * and computes the correct topological evaluation order.
 * @param rules
 * @param study
 * @param options
 * @param options.isExport
 * @param options.yieldControl
 * @param options.cancellationToken
 * @param options.cancellationToken.isCancelled
 * @param options.preCachedVariables
 * @returns
 */
export async function validateRules(
  rules: RuleDefinition[],
  study?: StudyDesign,
  options?: {
    isExport?: boolean;
    yieldControl?: () => Promise<void>;
    cancellationToken?: { isCancelled: () => boolean };
    preCachedVariables?: Map<string, DataType>;
  }
): Promise<RuleValidationResult> {
  const errors: RuleValidationError[] = [];
  const dependencyMap: Record<string, string[]> = {};
  const topologicalOrder: string[] = [];

  if (!rules || rules.length === 0) {
    return { isValid: true, errors: [], topologicalOrder: [], dependencyMap: {} };
  }

  // 1. Map rule definitions and detect duplicate Rule IDs
  const ruleMap = new Map<string, RuleDefinition[]>();
  const knownRuleIds = new Set<string>();

  for (const rule of rules) {
    if (!rule.ruleId) continue;
    const ruleIdUpper = rule.ruleId.trim();
    knownRuleIds.add(ruleIdUpper);

    const list = ruleMap.get(ruleIdUpper) || [];
    list.push(rule);
    ruleMap.set(ruleIdUpper, list);
  }

  ruleMap.forEach((list) => {
    if (list.length > 1) {
      list.forEach((rule) => {
        errors.push({
          level: "Error",
          ruleId: rule.ruleId,
          message: `Duplicate Rule ID: '${rule.ruleId}' is defined multiple times.`,
          type: "DUPLICATE_RULE_ID",
          rowIndex: rule._sourceRowIndex,
        });
      });
    }
  });

  // 2. Map target derivation variables and detect duplicate targets
  const targetMap = new Map<string, RuleDefinition[]>();
  const knownTargets = new Set<string>();

  for (const rule of rules) {
    if (rule.ruleType === RuleType.DERIVATION && rule.target) {
      const t = rule.target.trim();
      const tLower = t.toLowerCase();
      knownTargets.add(t);

      const list = targetMap.get(tLower) || [];
      list.push(rule);
      targetMap.set(tLower, list);
    }
  }

  targetMap.forEach((list) => {
    if (list.length > 1) {
      list.forEach((rule) => {
        const otherRuleIds = list
          .filter((r) => r !== rule)
          .map((r) => `'${r.ruleId}'`)
          .join(", ");
        errors.push({
          level: "Error",
          ruleId: rule.ruleId,
          message: `Duplicate Derivation Target: Variable '${rule.target}' is derived by multiple rules: '${rule.ruleId}' and ${otherRuleIds}.`,
          type: "DUPLICATE_TARGET",
          rowIndex: rule._sourceRowIndex,
        });
      });
    }
  });

  // 3. Propagate existing parse errors
  for (const rule of rules) {
    if (rule.parseError) {
      errors.push({
        level: "Error",
        ruleId: rule.ruleId,
        message: `Parse Error in rule '${rule.ruleId}': ${rule.parseError}`,
        type: "PARSE_ERROR",
        rowIndex: rule._sourceRowIndex,
      });
    }
  }

  // 4. Extract form variables if StudyDesign is provided
  const knownFormVariables = new Set<string>();
  if (options?.preCachedVariables) {
    for (const key of options.preCachedVariables.keys()) {
      knownFormVariables.add(key.toLowerCase());
    }
  } else if (study && study.forms) {
    for (const form of Object.values(study.forms)) {
      if (form.itemGroups) {
        for (const group of form.itemGroups) {
          if (group.items) {
            for (const item of group.items) {
              if (!isCrfItem(item)) {
                continue;
              }
              if (item.itemOid) {
                knownFormVariables.add(item.itemOid.toLowerCase());
              }
            }
          }
        }
      }
    }
  }

  // 5. Build Dependency Map and validate references
  const validRules = rules.filter((r) => !r.parseError && r.ruleId);

  const variablesMap = options?.preCachedVariables
    ? new Map(options.preCachedVariables)
    : new Map<string, DataType>();
  if (!options?.preCachedVariables && study && study.forms) {
    for (const form of Object.values(study.forms)) {
      if (form.itemGroups) {
        for (const group of form.itemGroups) {
          if (group.items) {
            for (const item of group.items) {
              if (!isCrfItem(item)) {
                continue;
              }
              if (item.itemOid) {
                variablesMap.set(item.itemOid, item.dataType as any);
              }
            }
          }
        }
      }
    }
  }

  const knownRuleIdsSet = new Set<string>();
  rules.forEach((r) => {
    if (r.ruleId) knownRuleIdsSet.add(r.ruleId);
  });

  // Also include derived variable targets
  for (const rule of rules) {
    if (rule.ruleType === RuleType.DERIVATION && rule.target && !variablesMap.has(rule.target)) {
      let inferredType: DataType | "Unknown" = "Unknown";
      if (rule.ast) {
        const type = inferExpressionType(rule.ast, variablesMap, knownRuleIdsSet);
        if (Object.values(DataType).includes(type as DataType)) {
          inferredType = type as DataType;
        }
      }
      variablesMap.set(rule.target, inferredType as DataType);
    }
  }

  for (let i = 0; i < validRules.length; i++) {
    if (options?.cancellationToken?.isCancelled?.()) {
      break;
    }
    const rule = validRules[i];

    // Chunking to prevent blocking UI during dependency map build
    if (i % 250 === 0 && options?.yieldControl) {
      await options.yieldControl();
    }

    const deps = new Set<string>();
    if (!rule.ast) {
      dependencyMap[rule.ruleId] = [];
      continue;
    }

    const identifiers = collectIdentifiers(rule.ast);

    for (const ident of identifiers) {
      let isResolved = false;

      // Check if identifier references a rule ID
      for (const otherRule of validRules) {
        if (matchesRef(ident, otherRule.ruleId)) {
          deps.add(otherRule.ruleId);
          isResolved = true;
        }
      }

      // Check if identifier references a derived target
      for (const otherRule of validRules) {
        if (
          otherRule.ruleType === RuleType.DERIVATION &&
          otherRule.target &&
          matchesRef(ident, otherRule.target)
        ) {
          deps.add(otherRule.ruleId);
          isResolved = true;
        }
      }

      // If we could resolve it, we don't need further checks
      if (isResolved) continue;

      // Check if it matches a standard rule ID pattern (e.g. R_001 or R123)
      const isRuleLikePattern = /^R(?:ule)?_?\d+$/i.test(ident);

      if (isRuleLikePattern) {
        errors.push({
          level: "Error",
          ruleId: rule.ruleId,
          message: `Rule '${rule.ruleId}' depends on rule '${ident}' which does not exist.`,
          type: "BROKEN_REFERENCE",
          rowIndex: rule._sourceRowIndex,
        });
        continue;
      }

      // If StudyDesign is available, verify if it references a valid form variable
      if (study) {
        const lastSegment = ident.includes(".") ? ident.split(".").pop()! : ident;
        const existsInForms =
          knownFormVariables.has(ident.toLowerCase()) ||
          knownFormVariables.has(lastSegment.toLowerCase());

        if (!existsInForms) {
          const isLocal = !ident.includes(".");
          const isExport = options?.isExport === true;
          const severity = isExport || isLocal ? "Error" : "Warning";
          errors.push({
            level: severity,
            ruleId: rule.ruleId,
            message: `Rule '${rule.ruleId}' references unresolved variable/dependency '${ident}'.`,
            type: "UNRESOLVED_VARIABLE",
            rowIndex: rule._sourceRowIndex,
          });
        }
      }
    }

    dependencyMap[rule.ruleId] = Array.from(deps);

    // Run deep expression analysis and type checking
    if (rule.ast) {
      const exprDiagnostics = validateExpression(rule.ast, variablesMap, knownRuleIdsSet);
      exprDiagnostics.forEach((diag) => {
        // Skip unresolved variable checks inside the expression validator loop here
        // to avoid duplicate warnings or false positives on standalone test rules.
        if (diag.type === "UNRESOLVED_VARIABLE") {
          return;
        }
        errors.push({
          level: diag.level,
          ruleId: rule.ruleId,
          message: `Rule '${rule.ruleId}' expression issue: ${diag.message}`,
          type: diag.type,
          rowIndex: rule._sourceRowIndex,
        });
      });
    }
  }

  // 6. Execute cycle detection and topological sorting
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const cycles = new Set<string>(); // Tracks unique canonical cycle strings to prevent duplicates

  function getCanonicalCycleKey(path: string[]): string {
    const nodes = path.slice(0, -1);
    let minIdx = 0;
    for (let i = 1; i < nodes.length; i++) {
      if (nodes[i] < nodes[minIdx]) {
        minIdx = i;
      }
    }
    const rotated = [...nodes.slice(minIdx), ...nodes.slice(0, minIdx)];
    rotated.push(rotated[0]);
    return rotated.join(" -> ");
  }

  let dfsIterations = 0;

  for (const rule of validRules) {
    if (options?.cancellationToken?.isCancelled?.()) {
      break;
    }
    if (visited.has(rule.ruleId)) continue;

    const stack: { nodeId: string; originRowIndex?: number; deps: string[]; depIndex: number }[] =
      [];
    stack.push({
      nodeId: rule.ruleId,
      originRowIndex: rule._sourceRowIndex,
      deps: dependencyMap[rule.ruleId] || [],
      depIndex: 0,
    });

    visiting.add(rule.ruleId);

    while (stack.length > 0) {
      dfsIterations++;
      if (dfsIterations % 100 === 0 && options?.yieldControl) {
        await options.yieldControl();
      }

      const top = stack[stack.length - 1];

      if (top.depIndex < top.deps.length) {
        const nextDep = top.deps[top.depIndex];
        top.depIndex++;

        if (visiting.has(nextDep)) {
          // Cycle found!
          const cyclePathNodes = stack.map((s) => s.nodeId);
          const cycleStart = cyclePathNodes.indexOf(nextDep);

          if (cycleStart !== -1) {
            const rawCyclePath = cyclePathNodes.slice(cycleStart);
            rawCyclePath.push(nextDep);

            const canonicalKey = getCanonicalCycleKey(rawCyclePath);
            if (!cycles.has(canonicalKey)) {
              cycles.add(canonicalKey);

              const details: string[] = [];
              for (let i = 0; i < rawCyclePath.length - 1; i++) {
                const current = rawCyclePath[i];
                const next = rawCyclePath[i + 1];
                const ruleDef = rules.find((r) => r.ruleId === current);
                const targetStr = ruleDef && ruleDef.target ? ` (target: ${ruleDef.target})` : "";
                details.push(`Rule '${current}'${targetStr} -> Rule '${next}'`);
              }

              errors.push({
                level: "Error",
                ruleId: nextDep,
                message: `Circular dependency detected: ${canonicalKey}`,
                type: "CYCLE",
                cyclePath: rawCyclePath,
                actionableExplanation: `Circular logic loop detected: ${details.join(", ")}. Please remove circular dependencies.`,
                rowIndex:
                  top.originRowIndex || rules.find((r) => r.ruleId === nextDep)?._sourceRowIndex,
              });
            }
          }
        } else if (!visited.has(nextDep)) {
          visiting.add(nextDep);
          stack.push({
            nodeId: nextDep,
            originRowIndex: top.originRowIndex,
            deps: dependencyMap[nextDep] || [],
            depIndex: 0,
          });
        }
      } else {
        // Post-visit
        stack.pop();
        visiting.delete(top.nodeId);
        if (!visited.has(top.nodeId)) {
          visited.add(top.nodeId);
          topologicalOrder.push(top.nodeId);
        }
      }
    }
  }

  const hasCycle = errors.some((e) => e.type === "CYCLE");
  const isValid = !errors.some((e) => e.level === "Error");

  return {
    isValid,
    errors,
    topologicalOrder: hasCycle ? [] : topologicalOrder,
    dependencyMap,
  };
}
