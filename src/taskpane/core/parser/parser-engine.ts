import {
  StudyDesign,
  DataType,
  CrfItem,
  EventType,
  StudyEvent,
  isCrfDisplayBlock,
} from "../types/index";
import { createParseRuntime, ParseRuntimeOptions, processRowsInChunks } from "./chunking-runtime";
import { parseRulesSheetRows } from "./rules-parser";
import { migrateStudyDesign } from "./migration";
import { mapRowToFormElement } from "./form-element-utils";
import { parseReferencedVariables } from "./metadata-utils";

export interface ParseExcelToStudyDesignOptions extends ParseRuntimeOptions {
  allowPartialSheetFailures?: boolean;
}

export async function parseRawDataToStudyDesign(
  rawData: Record<string, any[][]>,
  options: ParseExcelToStudyDesignOptions = {}
): Promise<StudyDesign> {
  const runtime = createParseRuntime(options);
  const study: StudyDesign = {
    metadata: {
      protocolId: "PROT-XXXX",
      studyName: "Untitled",
      version: "1.0",
      defaultLanguage: "en-US",
    },
    events: [],
    forms: {},
    codelists: {},
  };
  const parseWarnings: string[] = [];
  const allowPartialSheetFailures = options.allowPartialSheetFailures ?? true;

  // 1. Parse _Study Metadata
  runtime.reportProgress({
    phase: "metadata",
    completed: 0,
    total: 1,
    message: "Reading _Study metadata",
  });
  runtime.throwIfStopped("metadata");

  const metaSheetVals = rawData["_Study"];
  if (metaSheetVals && metaSheetVals.length > 1) {
    study.metadata.protocolId = String(metaSheetVals[1][0] || study.metadata.protocolId);
    study.metadata.studyName = String(metaSheetVals[1][1] || study.metadata.studyName);
    study.metadata.version = String(metaSheetVals[1][2] || study.metadata.version);
  }

  runtime.reportProgress({
    phase: "metadata",
    completed: 1,
    total: 1,
    message: "Completed _Study metadata",
  });
  await runtime.yieldToHost();

  // 2. Parse _Codelists
  runtime.reportProgress({
    phase: "codelists",
    completed: 0,
    total: 1,
    message: "Reading _Codelists",
  });
  runtime.throwIfStopped("codelists");
  const clSheetVals = rawData["_Codelists"];
  if (clSheetVals) {
    const rows = clSheetVals.slice(1);
    runtime.reportProgress({
      phase: "codelists",
      completed: 0,
      total: rows.length,
      message: "Processing codelist rows",
    });
    await processRowsInChunks(rows, runtime, "codelists", (row, rowIndex) => {
      runtime.throwIfStopped("codelists");
      const [id, name, code, decode] = row;
      if (!id) return;
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
        decodedText: { "en-US": String(decode) },
        orderNumber: study.codelists[strId].items.length + 1,
      });
      runtime.reportProgress({
        phase: "codelists",
        completed: rowIndex + 1,
        total: rows.length,
        message: "Processing codelist rows",
      });
    });
  }
  runtime.reportProgress({
    phase: "codelists",
    completed: 1,
    total: 1,
    message: "Completed _Codelists",
  });

  // 3. Parse _Forms (The Registry)
  runtime.reportProgress({
    phase: "forms",
    completed: 0,
    total: 1,
    message: "Reading _Forms registry",
  });
  runtime.throwIfStopped("forms");
  const formSheetVals = rawData["_Forms"];
  const activeFormOids: string[] = [];

  if (formSheetVals) {
    const rows = formSheetVals.slice(1);
    await processRowsInChunks(rows, runtime, "forms", (row, rowIndex) => {
      runtime.throwIfStopped("forms");
      const i = rowIndex + 1;
      const [id, name, rep] = row;
      if (!id) return;
      const strId = String(id).trim();
      activeFormOids.push(strId);

      study.forms[strId] = {
        formOid: strId,
        formName: String(name),
        orderNumber: i,
        repeating: String(rep).toLowerCase() === "yes",
        itemGroups: [
          {
            groupOid: `${strId}_GRP`,
            name: "Default Group",
            repeating: false,
            orderNumber: 1,
            items: [],
          },
        ],
        effectiveVersion: study.metadata.version,
      };
      runtime.reportProgress({
        phase: "forms",
        completed: rowIndex + 1,
        total: rows.length,
        message: "Processing forms registry",
      });
    });
  }
  runtime.reportProgress({
    phase: "forms",
    completed: activeFormOids.length,
    total: activeFormOids.length || 1,
    message: "Completed _Forms registry",
  });

  // 4. Dynamic Multi-Pass: Parse Individual CRF Sheets
  for (let formIndex = 0; formIndex < activeFormOids.length; formIndex++) {
    runtime.throwIfStopped("items");
    const oid = activeFormOids[formIndex];
    runtime.reportProgress({
      phase: "items",
      completed: formIndex,
      total: activeFormOids.length,
      message: `Reading form sheet ${oid} (${formIndex + 1}/${activeFormOids.length})`,
    });

    const crfSheetVals = rawData[oid];
    if (!crfSheetVals) {
      runtime.reportProgress({
        phase: "items",
        completed: formIndex + 1,
        total: activeFormOids.length || 1,
        message: `Processed form sheet ${oid} (${formIndex + 1}/${activeFormOids.length})`,
      });
      continue;
    }

    try {
      if (crfSheetVals.length > 1) {
        const headers = crfSheetVals[0] as string[];
        const targetGroup = study.forms[oid].itemGroups[0];
        const rows = crfSheetVals.slice(1);

        await processRowsInChunks(rows, runtime, "items", (row, rowIndex) => {
          runtime.throwIfStopped("items");
          const element = mapRowToFormElement(headers, row, oid, rowIndex + 2);
          if (isCrfDisplayBlock(element as any) || (element as CrfItem).itemOid) {
            targetGroup.items.push(element as any);
          }
        });
      }
    } catch (error) {
      if (!allowPartialSheetFailures) throw error;
      parseWarnings.push(
        `Sheet "${oid}" failed to parse and was skipped: ${error instanceof Error ? error.message : String(error)}`
      );
    }
    runtime.reportProgress({
      phase: "items",
      completed: formIndex + 1,
      total: activeFormOids.length || 1,
      message: `Processed form sheet ${oid} (${formIndex + 1}/${activeFormOids.length})`,
    });
    await runtime.yieldToHost();
  }

  // 5. Parse _Schedule (Transposing Matrix to Events)
  runtime.reportProgress({
    phase: "schedule",
    completed: 0,
    total: 1,
    message: "Reading _Schedule matrix",
  });
  runtime.throwIfStopped("schedule");
  const schedSheetVals = rawData["_Schedule"];

  if (schedSheetVals && schedSheetVals.length > 0) {
    const headers = schedSheetVals[0];
    const scheduleColumns = Array.from(
      { length: Math.max(headers.length - 1, 0) },
      (_, index) => index + 1
    );
    await processRowsInChunks(scheduleColumns, runtime, "schedule", (col, colIndex) => {
      runtime.throwIfStopped("schedule");
      const eventName = String(headers[col] || "").trim();
      if (!eventName) return;

      const eventOid = `VISIT_${col}`;
      const event: StudyEvent = {
        eventOid,
        eventName,
        orderNumber: col,
        eventType: EventType.SCHEDULED,
        forms: [],
        rowIndex: 0,
      } as any;

      for (let row = 1; row < schedSheetVals.length; row++) {
        const formOid = String(schedSheetVals[row][0] || "").trim();
        const marker = String(schedSheetVals[row][col] || "")
          .trim()
          .toUpperCase();

        if (marker === "X" || marker === "1") {
          event.forms.push({ formOid, orderNumber: event.forms.length + 1, mandatory: true });
        }
      }
      study.events.push(event);
      runtime.reportProgress({
        phase: "schedule",
        completed: colIndex + 1,
        total: scheduleColumns.length || 1,
        message: "Processing schedule matrix",
      });
    });
  }

  // 6. Parse _Rules Sheet
  runtime.reportProgress({
    phase: "rules",
    completed: 0,
    total: 1,
    message: "Reading _Rules sheet",
  });
  runtime.throwIfStopped("rules");
  const rulesSheetVals = rawData["_Rules"];

  if (rulesSheetVals) {
    try {
      if (rulesSheetVals.length > 0) {
        const { rules, errors } = parseRulesSheetRows(rulesSheetVals, study.metadata.version);
        study.rules = rules;

        errors.forEach((err) => {
          parseWarnings.push(`_Rules Row ${err.line}: ${err.message}`);
        });
      }
    } catch (error) {
      if (!allowPartialSheetFailures) throw error;
      parseWarnings.push(
        `Sheet "_Rules" failed to parse and was skipped: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
  runtime.reportProgress({
    phase: "rules",
    completed: 1,
    total: 1,
    message: "Completed _Rules sheet",
  });

  // 7. Parse _Methods Sheet
  runtime.reportProgress({
    phase: "methods",
    completed: 0,
    total: 1,
    message: "Reading _Methods sheet",
  });
  runtime.throwIfStopped("methods");
  const methodsSheetVals = rawData["_Methods"];
  study.methods = {};
  if (methodsSheetVals) {
    try {
      if (methodsSheetVals.length > 1) {
        const rows = methodsSheetVals.slice(1);
        await processRowsInChunks(rows, runtime, "methods", (row) => {
          runtime.throwIfStopped("methods");
          const [oid, name, type, description, expression, referencedVariables] = row;
          if (!oid) return;
          const strOid = String(oid).trim();
          study.methods![strOid] = {
            methodOid: strOid,
            name: String(name || "").trim(),
            type: String(type || "").trim(),
            description: description ? String(description).trim() : undefined,
            expression: expression ? String(expression).trim() : undefined,
            referencedVariables: parseReferencedVariables(referencedVariables),
          };
        });
      }
    } catch (error) {
      if (!allowPartialSheetFailures) throw error;
      parseWarnings.push(
        `Sheet "_Methods" failed to parse and was skipped: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
  runtime.reportProgress({
    phase: "methods",
    completed: 1,
    total: 1,
    message: "Completed _Methods sheet",
  });

  if (parseWarnings.length > 0) {
    study.metadata.customProperties = {
      ...(study.metadata.customProperties ?? {}),
      parseWarnings,
    };
  }

  runtime.reportProgress({
    phase: "complete",
    completed: 1,
    total: 1,
    message: "Workbook analysis completed",
  });

  return migrateStudyDesign(study);
}
