import { CrfItem, DataType, EventType, StudyDesign, StudyEvent, isCrfDisplayBlock } from "../types";
import { mapRowToFormElement } from "./form-element-utils";
import { migrateStudyDesign } from "./migration";
import { parseReferencedVariables } from "./metadata-utils";
import { parseRulesSheetRows } from "./rules-parser";
import { getLocaleConfig } from "../locale-config";

export interface WorkbookSheetValuesProvider {
  getSheetValues(sheetName: string): Promise<unknown[][] | null>;
}

export interface ParseWorkbookSheetValuesOptions {
  allowPartialSheetFailures?: boolean;
}

export async function parseWorkbookSheetValuesToStudyDesign(
  provider: WorkbookSheetValuesProvider,
  options: ParseWorkbookSheetValuesOptions = {}
): Promise<StudyDesign> {
  const study: StudyDesign = {
    metadata: {
      protocolId: "PROT-XXXX",
      studyName: "Untitled",
      version: "1.0",
      defaultLanguage: getLocaleConfig().currentLocale,
    },
    events: {},
    forms: {},
    groups: {},
    items: {},
    codelists: {},
  };
  const parseWarnings: string[] = [];
  const allowPartialSheetFailures = options.allowPartialSheetFailures ?? true;

  const metadataRows = await provider.getSheetValues("_Study");
  if (metadataRows && metadataRows.length > 1) {
    study.metadata.protocolId = String(metadataRows[1][0] || study.metadata.protocolId);
    study.metadata.studyName = String(metadataRows[1][1] || study.metadata.studyName);
    study.metadata.version = String(metadataRows[1][2] || study.metadata.version);
    study.metadata.defaultLanguage = String(metadataRows[1][3] || study.metadata.defaultLanguage);
  }

  const codelistRows = await provider.getSheetValues("_Codelists");
  if (codelistRows) {
    for (const row of codelistRows.slice(1)) {
      const [id, name, code, decode] = row;
      if (!id) continue;
      const strId = String(id).trim();
      if (!study.codelists[strId]) {
        study.codelists[strId] = {
          codelistId: strId,
          codelistName: String(name),
          dataType: DataType.TEXT,
          items: [],
        };
      }
      study.codelists[strId].items.push({
        codelistId: strId,
        codedValue: String(code),
        decodedText: { [study.metadata.defaultLanguage]: String(decode) },
        orderNumber: study.codelists[strId].items.length + 1,
      });
    }
  }

  const activeFormOids: string[] = [];
  const formRows = await provider.getSheetValues("_Forms");
  if (formRows) {
    const rows = formRows.slice(1);
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
      const row = rows[rowIndex];
      const [id, name, rep] = row;
      if (!id) continue;
      const strId = String(id).trim();
      activeFormOids.push(strId);
      study.forms[strId] = {
        formOid: strId,
        formName: String(name),
        orderNumber: rowIndex + 1,
        repeating: String(rep).toLowerCase() === "yes",
        
        effectiveVersion: study.metadata.version,
      };
    }
  }

  for (const oid of activeFormOids) {
    const crfRows = await provider.getSheetValues(oid);
    if (!crfRows) continue;
    try {
      if (crfRows.length > 1) {
        const headers = crfRows[0] as string[];
        for (let rowIndex = 0; rowIndex < crfRows.slice(1).length; rowIndex += 1) {
          const row = crfRows[rowIndex + 1];
          const element = mapRowToFormElement(headers, row, oid, rowIndex + 2);
          if (isCrfDisplayBlock(element as any) || (element as CrfItem).itemOid) {
            study.items[((element as CrfItem).itemOid) || `display_${Date.now()}_${Math.random()}`] = { ...element, formOid: oid, groupOid: `${oid}_G1` } as any;
          }
        }
      }
    } catch (error) {
      if (!allowPartialSheetFailures) throw error;
      parseWarnings.push(
        `Sheet "${oid}" failed to parse and was skipped: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  const scheduleRows = await provider.getSheetValues("_Schedule");
  if (scheduleRows && scheduleRows.length > 0) {
    const headers = scheduleRows[0];
    for (let col = 1; col < headers.length; col += 1) {
      const eventName = String(headers[col]).trim();
      if (!eventName) continue;
      const event: StudyEvent = {
        eventOid: `VISIT_${col}`,
        eventName,
        orderNumber: col,
        eventType: EventType.SCHEDULED,
        forms: [],
        rowIndex: 0,
      } as any;
      for (let row = 1; row < scheduleRows.length; row += 1) {
        const formOid = String(scheduleRows[row][0]).trim();
        const marker = String(scheduleRows[row][col]).trim().toUpperCase();
        if (marker === "X" || marker === "1") {
          event.forms.push({ formOid, orderNumber: event.forms.length + 1, mandatory: true });
        }
      }
      study.events[event.eventOid] = event;
    }
  }

  const rulesRows = await provider.getSheetValues("_Rules");
  if (rulesRows) {
    try {
      const { rules, errors } = parseRulesSheetRows(rulesRows, study.metadata.version);
      study.rules = rules;
      errors.forEach((err) => {
        parseWarnings.push(`_Rules Row ${err.line}: ${err.message}`);
      });
    } catch (error) {
      if (!allowPartialSheetFailures) throw error;
      parseWarnings.push(
        `Sheet "_Rules" failed to parse and was skipped: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  const methodsRows = await provider.getSheetValues("_Methods");
  study.methods = {};
  if (methodsRows) {
    try {
      for (const row of methodsRows.slice(1)) {
        const [oid, name, type, description, expression, referencedVariables] = row;
        if (!oid) continue;
        const strOid = String(oid).trim();
        study.methods[strOid] = {
          methodOid: strOid,
          name: String(name || "").trim(),
          type: String(type || "").trim(),
          description: description ? String(description).trim() : undefined,
          expression: expression ? String(expression).trim() : undefined,
          referencedVariables: parseReferencedVariables(referencedVariables),
        };
      }
    } catch (error) {
      if (!allowPartialSheetFailures) throw error;
      parseWarnings.push(
        `Sheet "_Methods" failed to parse and was skipped: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  if (parseWarnings.length > 0) {
    study.metadata.customProperties = {
      ...(study.metadata.customProperties ?? {}),
      parseWarnings,
    };
  }

  return migrateStudyDesign(study);
}
