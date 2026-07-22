/**
 * @issue #28, #40
 */

import { StudyDesign, isCrfItem } from "../types/index";
import { RuleDefinition, RuleType } from "../types/rules-ast";
import { parseRuleExpression } from "./rules-parser";
import { ClinicalIterator, SortStrategy } from "../generators/clinical-iterator";

function targetMatchesItem(target: string | undefined, itemOid: string): boolean {
  if (!target) return false;
  const targetLower = target.trim().toLowerCase();
  const itemLower = itemOid.trim().toLowerCase();
  if (targetLower === itemLower) return true;
  return targetLower.endsWith("." + itemLower);
}

export function compileSyntheticRules(study: StudyDesign): void {
  const iterator = new ClinicalIterator({ sortStrategy: SortStrategy.NATURAL });
  const syntheticRules: RuleDefinition[] = [];

  for (const { item } of iterator.walkForms(study)) {
    if (!isCrfItem(item)) continue;
    if (item.showIf) {
      const hasCentralRule = study.rules?.some(
        (r) =>
          r.ruleType === RuleType.SHOW_IF && r.target && targetMatchesItem(r.target, item.itemOid)
      );
      if (!hasCentralRule) {
        const ruleId = `COND.${item.itemOid}`;
        const syntheticRule: RuleDefinition = {
          ruleId,
          ruleType: RuleType.SHOW_IF,
          target: item.itemOid,
          expression: item.showIf,
          _sourceRowIndex: -1,
        };
        try {
          syntheticRule.ast = parseRuleExpression(item.showIf);
        } catch (e) {
          syntheticRule.parseError = e instanceof Error ? e.message : String(e);
        }
        syntheticRules.push(syntheticRule);
      }
    }
  }

  if (study.methods) {
    Object.values(study.methods).forEach((method) => {
      if (method.expression) {
        const ruleId = method.methodOid.trim();
        if (!study.rules?.some((r) => r.ruleId === ruleId)) {
          const syntheticRule: RuleDefinition = {
            ruleId,
            name: method.name,
            description: method.description,
            ruleType: RuleType.DERIVATION,
            expression: method.expression,
            _sourceRowIndex: -1,
          };
          try {
            syntheticRule.ast = parseRuleExpression(method.expression);
          } catch (e) {
            syntheticRule.parseError = e instanceof Error ? e.message : String(e);
          }
          syntheticRules.push(syntheticRule);
        }
      }
    });
  }

  if (syntheticRules.length > 0) {
    study.rules = [...(study.rules || []), ...syntheticRules];
  }
}
