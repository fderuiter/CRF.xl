/**
 * @issue #44, #139
 */
/* eslint-disable no-undef */
import {
  StudyDesign,
  DataType,
  TranslatedText,
  CrfItem,
  RuleType,
  isCrfItem,
  ASTNode,
  RuleDefinition,
} from "../../types/index";
import { validateRules, RuleValidationError } from "../../parser/dag-validator";
import { parseRuleExpression } from "../../parser/rules-parser";
import { LinguisticService } from "../../services/linguistics-service";

/**
 * Error thrown when rules pre-serialization validation fails.
 */
export class OdmSerializationError extends Error {
  public readonly errors: RuleValidationError[];
  constructor(message: string, errors: RuleValidationError[]) {
    super(message);
    this.name = "OdmSerializationError";
    this.errors = errors;
    Object.setPrototypeOf(this, OdmSerializationError.prototype);
  }
}

/**
 * Helper to match a rule target against an item OID.
 * Matches case-insensitively, supporting either the exact variable name
 * or the final dot-separated segment (e.g., "VS.WT" matches "WT").
 */
function targetMatchesItem(target: string | undefined, itemOid: string): boolean {
  if (!target) return false;
  const targetLower = target.trim().toLowerCase();
  const itemLower = itemOid.trim().toLowerCase();
  if (targetLower === itemLower) return true;
  return targetLower.endsWith("." + itemLower);
}

export interface OdmExportResult {
  xml: string;
  diagnostics?: string;
}

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
    case "CallExpression":
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
    default:
      return "";
  }
}

/**
 * Main entry point for CDISC ODM v1.3.2 Metadata generation.
 * Produces a "Snapshot" metadata file for EDC system ingestion.
 */
export async function generateOdmXml(
  study: StudyDesign,
  options: { bestEffort?: boolean } = {}
): Promise<OdmExportResult> {
  const timestamp = new Date().toISOString();
  const metadata = study.metadata;

  const serializationWarnings: string[] = [];
  const diagnosticsLines: string[] = [];
  let finalDiagnostics: string | undefined = undefined;

  // Gather synthetic rules from inline showIf and methods
  const syntheticRules: RuleDefinition[] = [];
  Object.values(study.forms).forEach((form) => {
    form.itemGroups.forEach((group) => {
      group.items.forEach((item) => {
        if (!isCrfItem(item)) return;
        if (item.showIf) {
          const hasCentralRule = study.rules?.some(
            (r) =>
              r.ruleType === RuleType.SHOW_IF &&
              r.target &&
              targetMatchesItem(r.target, item.itemOid)
          );
          if (!hasCentralRule) {
            const ruleId = `COND.${item.itemOid}`;
            const syntheticRule: RuleDefinition = {
              ruleId,
              ruleType: RuleType.SHOW_IF,
              target: item.itemOid,
              expression: item.showIf,
              _sourceRowIndex: -1, // Indicates it's not from a sheet row directly
            };
            try {
              syntheticRule.ast = parseRuleExpression(item.showIf);
            } catch (e) {
              syntheticRule.parseError = e instanceof Error ? e.message : String(e);
            }
            syntheticRules.push(syntheticRule);
          }
        }
      });
    });
  });

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

  const allRules = [...(study.rules || []), ...syntheticRules];

  // Run pre-serialization validation if rules are present
  let topOrder: string[] = [];
  if (allRules.length > 0) {
    const validationResult = await validateRules(allRules, study, { isExport: true });
    topOrder = validationResult.topologicalOrder;

    const criticalErrors = validationResult.errors.filter((e) => e.type === "CYCLE");
    const errors = validationResult.errors.filter((e) => e.level === "Error");

    if (criticalErrors.length > 0) {
      throw new OdmSerializationError("Rule pre-serialization validation failed", criticalErrors);
    }

    if (errors.length > 0 && !options.bestEffort) {
      throw new OdmSerializationError("Rule pre-serialization validation failed", errors);
    }

    if (errors.length > 0 && options.bestEffort) {
      diagnosticsLines.push("=== Export Diagnostic Report ===");
      diagnosticsLines.push("Best-Effort mode active. The following logic errors were ignored:");
      errors.forEach((e) => {
        diagnosticsLines.push(
          `- Rule '${e.ruleId}'${e.rowIndex && e.rowIndex > 0 ? ` (Row ${e.rowIndex})` : ""}: ${e.message}`
        );
      });
    }

    // Collect validation warnings
    const warnings = validationResult.errors.filter((e) => e.level === "Warning");
    warnings.forEach((w) => {
      const warningMsg = `Rule '${w.ruleId}': ${w.message}`;
      console.warn(warningMsg);
      serializationWarnings.push(warningMsg);
    });

    // Check if targets exist in study design for SHOW_IF and DERIVATION rules
    const studyItemOids = new Set<string>();
    Object.values(study.forms).forEach((form) => {
      form.itemGroups.forEach((group) => {
        group.items.forEach((item) => {
          if (!isCrfItem(item)) {
            return;
          }
          if (item.itemOid) {
            studyItemOids.add(item.itemOid.toLowerCase());
          }
        });
      });
    });

    allRules.forEach((rule) => {
      if (rule.target) {
        const targetLower = rule.target.trim().toLowerCase();
        let exists = studyItemOids.has(targetLower);
        if (!exists) {
          // Check if targetLower matches as a suffix (e.g. "vis.vs.wt" ends with ".wt")
          const lastSegment = targetLower.includes(".")
            ? targetLower.split(".").pop()!
            : targetLower;
          exists = studyItemOids.has(lastSegment);
        }

        if (!exists) {
          if (rule.ruleType === RuleType.DERIVATION) {
            const warnMsg = `Derivation target '${rule.target}' not found in study design; MethodDef will be serialized but not linked to any ItemDef.`;
            console.warn(warnMsg);
            serializationWarnings.push(warnMsg);
          } else if (rule.ruleType === RuleType.SHOW_IF) {
            const warnMsg = `ShowIf target '${rule.target}' not found in study design; ConditionDef will be serialized but not linked to any ItemRef.`;
            console.warn(warnMsg);
            serializationWarnings.push(warnMsg);
          }
        }
      } else {
        if (rule.ruleType === RuleType.DERIVATION) {
          const warnMsg = `Derivation rule '${rule.ruleId}' has no target variable; MethodDef will be serialized but not linked.`;
          console.warn(warnMsg);
          serializationWarnings.push(warnMsg);
        } else if (rule.ruleType === RuleType.SHOW_IF) {
          const warnMsg = `ShowIf rule '${rule.ruleId}' has no target variable; ConditionDef will be serialized but not linked.`;
          console.warn(warnMsg);
          serializationWarnings.push(warnMsg);
        }
      }
    });
  }

  if (diagnosticsLines.length > 0) {
    finalDiagnostics = diagnosticsLines.join("\n");
  }

  // Header & Root Entity
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<ODM xmlns="http://www.cdisc.org/ns/odm/v1.3" 
     xmlns:crfx="http://www.cdisc.org/ns/odm/v1.3-ext"
     FileType="Snapshot" 
     FileOID="${escapeXml(metadata.protocolId)}_${escapeXml(metadata.version)}_${timestamp.replace(/[:.-]/g, "")}" 
     CreationDateTime="${timestamp}" 
     ODMVersion="1.3.2">`;

  xml += `
  <Study OID="${escapeXml(metadata.protocolId)}">
    <GlobalVariables>
      <StudyName>${escapeXml(metadata.studyName)}</StudyName>
      <StudyDescription>Metadata export for Protocol ${escapeXml(metadata.protocolId)}</StudyDescription>
      <ProtocolName>${escapeXml(metadata.protocolId)}</ProtocolName>
    </GlobalVariables>
    <MetaDataVersion OID="MV.${escapeXml(metadata.version)}" Name="Version ${escapeXml(metadata.version)}">`;

  // 1. Protocol / Event References
  xml += `
      <Protocol>`;
  study.events.forEach((event) => {
    xml += `
        <StudyEventRef StudyEventOID="${escapeXml(event.eventOid)}" OrderNumber="${event.orderNumber}" Mandatory="Yes"/>`;
  });
  xml += `
      </Protocol>`;

  // 2. Study Event Definitions (Visits)
  study.events.forEach((event) => {
    xml += `
      <StudyEventDef OID="${escapeXml(event.eventOid)}" Name="${escapeXml(event.eventName)}" Type="${escapeXml(event.eventType || "Scheduled")}" Repeating="No">`;
    event.forms.forEach((fRef) => {
      xml += `
        <FormRef FormOID="${escapeXml(fRef.formOid)}" OrderNumber="${fRef.orderNumber}" Mandatory="${fRef.mandatory ? "Yes" : "No"}"/>`;
    });
    xml += `
      </StudyEventDef>`;
  });

  // 3. Form Definitions (Pages)
  Object.values(study.forms).forEach((form) => {
    xml += `
      <FormDef OID="${escapeXml(form.formOid)}" Name="${escapeXml(form.formName)}" Repeating="${form.repeating ? "Yes" : "No"}">`;
    form.itemGroups.forEach((group) => {
      xml += `
        <ItemGroupRef ItemGroupOID="${escapeXml(group.groupOid)}" OrderNumber="${group.orderNumber}" Mandatory="Yes"/>`;
    });
    xml += `
      </FormDef>`;
  });

  // 4. ItemGroup Definitions (Sections/Grids)
  Object.values(study.forms).forEach((form) => {
    form.itemGroups.forEach((group) => {
      xml += `
      <ItemGroupDef OID="${escapeXml(group.groupOid)}" Name="${escapeXml(group.name)}" Repeating="${group.repeating ? "Yes" : "No"}">`;
      group.items.forEach((item) => {
        if (!isCrfItem(item)) {
          return;
        }
        // Find matching centralized SHOW_IF rule
        const showIfRule = allRules.find(
          (r) =>
            r.ruleType === RuleType.SHOW_IF && r.target && targetMatchesItem(r.target, item.itemOid)
        );

        let conditionAttr = "";
        if (showIfRule) {
          conditionAttr = ` CollectionExceptionConditionOID="${escapeXml(showIfRule.ruleId)}"`;
        } else if (item.showIf) {
          conditionAttr = ` CollectionExceptionConditionOID="COND.${escapeXml(item.itemOid)}"`;
        }

        // Find matching VALIDATION rules
        const validationRules = allRules.filter(
          (r) =>
            r.ruleType === RuleType.VALIDATION &&
            r.target &&
            targetMatchesItem(r.target, item.itemOid)
        );

        if (validationRules.length > 0) {
          const ruleOids = validationRules.map((r) => r.ruleId).join(" ");
          conditionAttr += ` crfx:ValidationConditionOIDs="${escapeXml(ruleOids)}"`;
        }

        xml += `
        <ItemRef ItemOID="${escapeXml(item.itemOid)}" OrderNumber="${item.orderNumber}" Mandatory="${item.validation.required ? "Yes" : "No"}"${conditionAttr}/>`;
      });
      xml += `
      </ItemGroupDef>`;
    });
  });

  // 5. Item Definitions (Questions)
  // Use a Set to ensure ItemDefs are unique (Shared across forms/groups)
  const processedItems = new Set<string>();
  Object.values(study.forms).forEach((form) => {
    form.itemGroups.forEach((group) => {
      group.items.forEach((item) => {
        if (!isCrfItem(item)) {
          return;
        }
        if (processedItems.has(item.itemOid)) return;
        processedItems.add(item.itemOid);

        // Find matching derivation rule
        const derivationRule = study.rules?.find(
          (r) =>
            r.ruleType === RuleType.DERIVATION &&
            r.target &&
            targetMatchesItem(r.target, item.itemOid)
        );

        xml += renderItemDef(item, derivationRule?.ruleId);
      });
    });
  });

  // 6. CodeLists (Dictionaries)
  Object.values(study.codelists).forEach((cl) => {
    const odmType = mapDataTypeToOdm(cl.dataType);
    xml += `
      <CodeList OID="${escapeXml(cl.codelistId)}" Name="${escapeXml(cl.codelistName)}" DataType="${odmType}">`;
    cl.items.forEach((clItem) => {
      xml += `
        <CodeListItem CodedValue="${escapeXml(clItem.codedValue)}">
          <Decode>${renderTranslatedText(clItem.decodedText)}</Decode>
        </CodeListItem>`;
    });
    xml += `
      </CodeList>`;
  });

  // 7. Condition Definitions (both inline and centralized rules)
  const processedConditions = new Set<string>();

  // 7a. Centralized SHOW_IF and VALIDATION rules in topological order
  if (allRules.length > 0) {
    // Sort rules based on topological order
    const sortedRules = [...allRules].sort((a, b) => {
      const idxA = topOrder.indexOf(a.ruleId);
      const idxB = topOrder.indexOf(b.ruleId);
      if (idxA === -1 && idxB === -1) return 0;
      if (idxA === -1) return 1;
      if (idxB === -1) return -1;
      return idxA - idxB;
    });

    sortedRules.forEach((rule) => {
      if (rule.ruleType === RuleType.SHOW_IF || rule.ruleType === RuleType.VALIDATION) {
        if (processedConditions.has(rule.ruleId)) return;
        processedConditions.add(rule.ruleId);

        let descElement = "";
        const descText =
          rule.ruleType === RuleType.VALIDATION
            ? rule.errorMessage || rule.description || ""
            : rule.description || "";
        if (descText) {
          descElement = `
        <Description>
          <TranslatedText xml:lang="en-US">${escapeXml(descText)}</TranslatedText>
        </Description>`;
        }

        const formalExpressionString =
          rule.ast && !rule.parseError ? serializeAST(rule.ast) : rule.expression;

        xml += `
      <ConditionDef OID="${escapeXml(rule.ruleId)}" Name="${escapeXml(rule.name || rule.ruleId)}">${descElement}
        <FormalExpression Context="CRF.xl">${escapeXml(formalExpressionString)}</FormalExpression>
      </ConditionDef>`;
      }
    });
  }

  // 7b. Inline showIf conditions (now handled in allRules)
  // We keep this to handle items that may have missed synthetic rules generation (fallback)
  Object.values(study.forms).forEach((form) => {
    form.itemGroups.forEach((group) => {
      group.items.forEach((item) => {
        if (!isCrfItem(item)) {
          return;
        }
        if (!item.showIf) return;

        const conditionOid = `COND.${item.itemOid}`;
        if (processedConditions.has(conditionOid)) return;

        const hasCentralRule = allRules.some(
          (r) =>
            r.ruleType === RuleType.SHOW_IF && r.target && targetMatchesItem(r.target, item.itemOid)
        );
        if (hasCentralRule) return;

        processedConditions.add(conditionOid);

        let formalExpressionString = item.showIf;
        try {
          const ast = parseRuleExpression(item.showIf);
          formalExpressionString = serializeAST(ast);
        } catch {
          // ignore
        }

        xml += `
      <ConditionDef OID="${escapeXml(conditionOid)}" Name="Show condition for ${escapeXml(item.name)}">
        <FormalExpression Context="CRF.xl">${escapeXml(formalExpressionString)}</FormalExpression>
      </ConditionDef>`;
      });
    });
  });

  // 8. Method Definitions (both rules and registry)
  const processedMethods = new Set<string>();
  if (allRules.length > 0) {
    const sortedRules = [...allRules].sort((a, b) => {
      const idxA = topOrder.indexOf(a.ruleId);
      const idxB = topOrder.indexOf(b.ruleId);
      if (idxA === -1 && idxB === -1) return 0;
      if (idxA === -1) return 1;
      if (idxB === -1) return -1;
      return idxA - idxB;
    });

    sortedRules.forEach((rule) => {
      if (rule.ruleType === RuleType.DERIVATION) {
        if (processedMethods.has(rule.ruleId)) return;
        processedMethods.add(rule.ruleId);

        let descElement = "";
        if (rule.description) {
          descElement = `
        <Description>
          <TranslatedText xml:lang="en-US">${escapeXml(rule.description)}</TranslatedText>
        </Description>`;
        }

        const formalExpressionString =
          rule.ast && !rule.parseError ? serializeAST(rule.ast) : rule.expression;

        xml += `
      <MethodDef OID="${escapeXml(rule.ruleId)}" Name="${escapeXml(rule.name || rule.ruleId)}" Type="Computation">${descElement}
        <FormalExpression Context="CRF.xl">${escapeXml(formalExpressionString)}</FormalExpression>
      </MethodDef>`;
      }
    });
  }

  // 8b. Centralized Method Definitions from _Methods sheet (fallback)
  if (study.methods) {
    Object.values(study.methods).forEach((method) => {
      const cleanOid = method.methodOid.trim();
      if (processedMethods.has(cleanOid)) return;
      processedMethods.add(cleanOid);

      let descElement = "";
      if (method.description) {
        descElement = `
        <Description>
          <TranslatedText xml:lang="en-US">${escapeXml(method.description)}</TranslatedText>
        </Description>`;
      }

      const typeAttr = method.type ? escapeXml(method.type) : "Computation";
      let formalExpressionElement = "";
      if (method.expression) {
        let formalExpressionString = method.expression;
        try {
          const ast = parseRuleExpression(method.expression);
          formalExpressionString = serializeAST(ast);
        } catch {
          // ignore
        }
        formalExpressionElement = `
        <FormalExpression Context="CRF.xl">${escapeXml(formalExpressionString)}</FormalExpression>`;
      }

      xml += `
      <MethodDef OID="${escapeXml(cleanOid)}" Name="${escapeXml(method.name || cleanOid)}" Type="${typeAttr}">${descElement}${formalExpressionElement}
      </MethodDef>`;
    });
  }

  xml += `
    </MetaDataVersion>
  </Study>
</ODM>`;

  if (serializationWarnings.length > 0) {
    // XML 1.0 prohibits '--' inside comments
    const safeWarnings = serializationWarnings.map((w) => w.replace(/--/g, "- -"));
    xml += `
<!--
  CRF.xl Serialization Warnings:
${safeWarnings.map((w) => `  - ${w}`).join("\n")}
-->`;
  }

  return { xml, diagnostics: finalDiagnostics };
}

/**
 * Renders an <ItemDef> block with clinical attributes and SDTM Aliases.
 */
function renderItemDef(item: CrfItem, derivationMethodOid?: string): string {
  const odmType = mapDataTypeToOdm(item.dataType);
  let output = `
      <ItemDef OID="${escapeXml(item.itemOid)}" Name="${escapeXml(item.name)}" DataType="${odmType}"`;

  if (Number.isInteger(item.length) && Number(item.length) > 0) {
    output += ` Length="${item.length}"`;
  }

  if (Number.isInteger(item.significantDigits) && Number(item.significantDigits) >= 0) {
    output += ` SignificantDigits="${item.significantDigits}"`;
  }

  if (item.sdtmMapping?.sasFieldName) {
    output += ` SASFieldName="${escapeXml(item.sdtmMapping.sasFieldName)}"`;
  }

  if (item.origin) {
    output += ` Origin="${escapeXml(item.origin)}"`;
  }

  const effectiveMethodOid = item.methodOid || derivationMethodOid;
  if (effectiveMethodOid) {
    output += ` MethodOID="${escapeXml(effectiveMethodOid)}"`;
  }

  if (item.comment) {
    output += ` Comment="${escapeXml(item.comment)}"`;
  }

  output += `>
        <Question>${renderTranslatedText(item.label)}</Question>`;

  if (item.validation?.rangeChecks && item.validation.rangeChecks.length > 0) {
    item.validation.rangeChecks.forEach((rc) => {
      const comparator = mapComparatorToOdm(rc.comparator);
      const softHard = rc.severity === "HardError" ? "Hard" : "Soft";

      output += `
        <RangeCheck Comparator="${comparator}" SoftHard="${softHard}">
          <CheckValue>${escapeXml(String(rc.value))}</CheckValue>`;

      if (rc.errorMessage) {
        output += `
          <ErrorMessage>${renderTranslatedText(rc.errorMessage)}</ErrorMessage>`;
      }

      output += `
        </RangeCheck>`;
    });
  }

  if (item.codelistId) {
    output += `
        <CodeListRef CodeListOID="${escapeXml(item.codelistId)}"/>`;
  }

  // SDTM Metadata Alias
  if (item.sdtmMapping?.domain && item.sdtmMapping?.variable) {
    output += `
        <Alias Context="SDTM" Name="${escapeXml(item.sdtmMapping.domain + "." + item.sdtmMapping.variable)}"/>`;
  }

  output += `
      </ItemDef>`;
  return output;
}

/**
 * Maps internal comparator signs to CDISC ODM standard comparators.
 */
function mapComparatorToOdm(comparator: string): string {
  switch (comparator) {
    case "<":
      return "LT";
    case "<=":
      return "LE";
    case ">":
      return "GT";
    case ">=":
      return "GE";
    case "==":
      return "EQ";
    case "!=":
      return "NE";
    default:
      return "EQ";
  }
}

/**
 * Maps internal DataType enum to CDISC ODM standard data types.
 */
function mapDataTypeToOdm(type: DataType): string {
  switch (type) {
    case DataType.INTEGER:
      return "integer";
    case DataType.FLOAT:
      return "float";
    case DataType.DATE:
      return "date";
    case DataType.DATETIME:
      return "datetime";
    case DataType.BOOLEAN:
      return "boolean";
    default:
      return "text";
  }
}

/**
 * Helper to render localized ODM TranslatedText tags.
 */
function renderTranslatedText(text: TranslatedText): string {
  let output = "";
  Object.entries(text).forEach(([lang, val]) => {
    const normLang = LinguisticService.normalizeLocale(lang);
    output += `<TranslatedText xml:lang="${normLang}">${escapeXml(val as string)}</TranslatedText>`;
  });
  return output;
}

/**
 * Robust XML escaping for clinical labels.
 */
function escapeXml(unsafe: string): string {
  if (!unsafe) return "";

  // 1. Strip prohibited control characters in U+0000-U+001F (excluding allowed XML 1.0 whitespace)
  const stripped = unsafe.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");

  // 2. Escape the 5 standard XML entities
  return stripped.replace(/[<>&"']/g, (c) => {
    switch (c) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      case '"':
        return "&quot;";
      case "'":
        return "&apos;";
      default:
        return c;
    }
  });
}
