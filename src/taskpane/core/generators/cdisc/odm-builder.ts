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
} from "../../types/index";
import { validateRules, RuleValidationError } from "../../parser/dag-validator";

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

/**
 * Main entry point for CDISC ODM v1.3.2 Metadata generation.
 * Produces a "Snapshot" metadata file for EDC system ingestion.
 */
export async function generateOdmXml(study: StudyDesign): Promise<string> {
  const timestamp = new Date().toISOString();
  const metadata = study.metadata;

  const serializationWarnings: string[] = [];

  // Run pre-serialization validation if rules are present
  if (study.rules && study.rules.length > 0) {
    const validationResult = await validateRules(study.rules, study, { isExport: true });

    // Check for any blocking errors
    const errors = validationResult.errors.filter((e) => e.level === "Error");
    if (errors.length > 0) {
      throw new OdmSerializationError("Rule pre-serialization validation failed", errors);
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

    study.rules.forEach((rule) => {
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

  // Header & Root Entity
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<ODM xmlns="http://www.cdisc.org/ns/odm/v1.3" 
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
        const showIfRule = study.rules?.find(
          (r) =>
            r.ruleType === RuleType.SHOW_IF && r.target && targetMatchesItem(r.target, item.itemOid)
        );

        let conditionAttr = "";
        if (showIfRule) {
          conditionAttr = ` CollectionExceptionConditionOID="${escapeXml(showIfRule.ruleId)}"`;
        } else if (item.showIf) {
          conditionAttr = ` CollectionExceptionConditionOID="COND.${escapeXml(item.itemOid)}"`;
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
  if (study.rules && study.rules.length > 0) {
    const validationResult = await validateRules(study.rules, study, { isExport: true });
    const topOrder = validationResult.topologicalOrder;

    // Sort rules based on topological order
    const sortedRules = [...study.rules].sort((a, b) => {
      return topOrder.indexOf(a.ruleId) - topOrder.indexOf(b.ruleId);
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

        xml += `
      <ConditionDef OID="${escapeXml(rule.ruleId)}" Name="${escapeXml(rule.name || rule.ruleId)}">${descElement}
        <FormalExpression Context="CRF.xl">${escapeXml(rule.expression)}</FormalExpression>
      </ConditionDef>`;
      }
    });
  }

  // 7b. Inline showIf conditions
  Object.values(study.forms).forEach((form) => {
    form.itemGroups.forEach((group) => {
      group.items.forEach((item) => {
        if (!isCrfItem(item)) {
          return;
        }
        if (!item.showIf) return;

        const conditionOid = `COND.${item.itemOid}`;
        if (processedConditions.has(conditionOid)) return;

        // Centralized rule takes precedence if it targets this item
        const hasCentralRule = study.rules?.some(
          (r) =>
            r.ruleType === RuleType.SHOW_IF && r.target && targetMatchesItem(r.target, item.itemOid)
        );
        if (hasCentralRule) return;

        processedConditions.add(conditionOid);

        xml += `
      <ConditionDef OID="${escapeXml(conditionOid)}" Name="Show condition for ${escapeXml(item.name)}">
        <FormalExpression Context="CRF.xl">${escapeXml(item.showIf)}</FormalExpression>
      </ConditionDef>`;
      });
    });
  });

  // 8. Method Definitions (both rules and registry)
  const processedMethods = new Set<string>();
  if (study.rules && study.rules.length > 0) {
    const validationResult = await validateRules(study.rules, study, { isExport: true });
    const topOrder = validationResult.topologicalOrder;

    // Sort rules based on topological order
    const sortedRules = [...study.rules].sort((a, b) => {
      return topOrder.indexOf(a.ruleId) - topOrder.indexOf(b.ruleId);
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

        xml += `
      <MethodDef OID="${escapeXml(rule.ruleId)}" Name="${escapeXml(rule.name || rule.ruleId)}" Type="Computation">${descElement}
        <FormalExpression Context="CRF.xl">${escapeXml(rule.expression)}</FormalExpression>
      </MethodDef>`;
      }
    });
  }

  // 8b. Centralized Method Definitions from _Methods sheet
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
        formalExpressionElement = `
        <FormalExpression Context="CRF.xl">${escapeXml(method.expression)}</FormalExpression>`;
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

  return xml;
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
    output += `<TranslatedText xml:lang="${lang}">${escapeXml(val as string)}</TranslatedText>`;
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
