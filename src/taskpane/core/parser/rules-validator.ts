/**
 * ============================================================================
 * rules-validator.ts
 * ============================================================================
 * Dependency Graph Validator and Topological Sorter for CRF.xl Rules.
 */

import { ASTNode, RuleDefinition, RuleType, StudyDesign, DataType } from "../types/index";
import { validateExpression } from "./expression-validator";

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

export interface RuleValidationResult {
  isValid: boolean;
  errors: RuleValidationError[];
  topologicalOrder: string[];
  dependencyMap: Record<string, string[]>;
}

/**
 * Traverses an ASTNode to collect all unique Identifier names referenced in the expression.
 */
export function collectIdentifiers(node: ASTNode): string[] {
  const idents = new Set<string>();

  function traverse(n: ASTNode) {
    if (!n) return;
    switch (n.type) {
      case "Identifier":
        idents.add(n.name);
        break;
      case "UnaryExpression":
        traverse(n.argument);
        break;
      case "BinaryExpression":
        traverse(n.left);
        traverse(n.right);
        break;
      case "ConditionalExpression":
        traverse(n.test);
        traverse(n.consequent);
        traverse(n.alternate);
        break;
      case "CallExpression":
        if (n.arguments) {
          n.arguments.forEach(traverse);
        }
        break;
      case "GroupedExpression":
        traverse(n.expression);
        break;
      case "Literal":
        break;
    }
  }

  traverse(node);
  return Array.from(idents);
}

/**
 * Checks if an identifier matches a reference (case-insensitively).
 * Matches either the exact name or the final dot-separated segment.
 * E.g., "VS.WT" matches "WT", and "VISIT_1.VS.WT" matches "WT".
 */
export function matchesRef(identifier: string, ref: string): boolean {
  const identLower = identifier.toLowerCase();
  const refLower = ref.toLowerCase();
  if (identLower === refLower) return true;
  return identLower.endsWith("." + refLower);
}

/**
 * Validates a dependency graph of rules, checks for cycles and broken references,
 * and computes the correct topological evaluation order.
 */
export function validateRules(rules: RuleDefinition[], study?: StudyDesign): RuleValidationResult {
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
  if (study && study.forms) {
    for (const form of Object.values(study.forms)) {
      if (form.itemGroups) {
        for (const group of form.itemGroups) {
          if (group.items) {
            for (const item of group.items) {
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

  const variablesMap = new Map<string, DataType>();
  if (study && study.forms) {
    for (const form of Object.values(study.forms)) {
      if (form.itemGroups) {
        for (const group of form.itemGroups) {
          if (group.items) {
            for (const item of group.items) {
              if (item.itemOid) {
                variablesMap.set(item.itemOid, item.dataType);
              }
            }
          }
        }
      }
    }
  }

  // Also include derived variable targets
  for (const rule of rules) {
    if (rule.ruleType === RuleType.DERIVATION && rule.target && !variablesMap.has(rule.target)) {
      variablesMap.set(rule.target, DataType.FLOAT);
    }
  }

  const knownRuleIdsSet = new Set<string>();
  rules.forEach((r) => {
    if (r.ruleId) knownRuleIdsSet.add(r.ruleId);
  });

  for (const rule of validRules) {
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
          errors.push({
            level: "Error",
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
          type: diag.type as any,
          rowIndex: rule._sourceRowIndex,
        });
      });
    }
  }

  // 6. Execute cycle detection and topological sorting
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const currentPath: string[] = [];
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

  function dfs(nodeId: string, originRowIndex?: number) {
    if (visiting.has(nodeId)) {
      const cycleStart = currentPath.indexOf(nodeId);
      if (cycleStart !== -1) {
        const rawCyclePath = currentPath.slice(cycleStart);
        rawCyclePath.push(nodeId);

        const canonicalKey = getCanonicalCycleKey(rawCyclePath);
        if (!cycles.has(canonicalKey)) {
          cycles.add(canonicalKey);

          // Build a highly descriptive error explanation
          const cyclePathNodes = rawCyclePath;
          const details: string[] = [];
          for (let i = 0; i < cyclePathNodes.length - 1; i++) {
            const current = cyclePathNodes[i];
            const next = cyclePathNodes[i + 1];
            const ruleDef = rules.find((r) => r.ruleId === current);
            const targetStr = ruleDef && ruleDef.target ? ` (target: ${ruleDef.target})` : "";
            details.push(`Rule '${current}'${targetStr} -> Rule '${next}'`);
          }

          errors.push({
            level: "Error",
            ruleId: nodeId,
            message: `Circular dependency detected: ${canonicalKey}`,
            type: "CYCLE",
            cyclePath: cyclePathNodes,
            actionableExplanation: `Circular logic loop detected: ${details.join(", ")}. Please remove circular dependencies.`,
            rowIndex: originRowIndex || rules.find((r) => r.ruleId === nodeId)?._sourceRowIndex,
          });
        }
      }
      return;
    }

    if (visited.has(nodeId)) return;

    visiting.add(nodeId);
    currentPath.push(nodeId);

    const deps = dependencyMap[nodeId] || [];
    for (const dep of deps) {
      dfs(dep, originRowIndex);
    }

    currentPath.pop();
    visiting.delete(nodeId);
    visited.add(nodeId);
    topologicalOrder.push(nodeId);
  }

  // Run DFS from each rule ID
  for (const rule of validRules) {
    dfs(rule.ruleId, rule._sourceRowIndex);
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
