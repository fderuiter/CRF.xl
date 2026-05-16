/* global Excel */
import { StudyDesign, DataType, CrfItem, EventType, StudyEvent } from '../types/index';
import { createParseRuntime, ParseRuntimeOptions, processRowsInChunks } from './chunking-runtime';

export interface ParseExcelToStudyDesignOptions extends ParseRuntimeOptions {
    allowPartialSheetFailures?: boolean;
}

/**
 * The Matrix-First Parser Engine
 * 1. Reads global metadata & dictionaries.
 * 2. Reads the _Forms registry to map active CRF tabs.
 * 3. Loops through each CRF tab to harvest questions.
 * 4. Transposes the _Schedule grid into visit events.
 */
export async function parseExcelToStudyDesign(options: ParseExcelToStudyDesignOptions = {}): Promise<StudyDesign> {
    const runtime = createParseRuntime(options);
    return await Excel.run(async (context) => {
        const sheets = context.workbook.worksheets;
        const study: StudyDesign = {
            metadata: { protocolId: "PROT-XXXX", studyName: "Untitled", version: "1.0", defaultLanguage: "en-US" },
            events: [], forms: {}, codelists: {}
        };
        const parseWarnings: string[] = [];
        const allowPartialSheetFailures = options.allowPartialSheetFailures ?? true;

        // 1. Parse _Study Metadata
        runtime.reportProgress({ phase: 'metadata', completed: 0, total: 1, message: "Reading _Study metadata" });
        runtime.throwIfStopped('metadata');
        const metaSheet = sheets.getItemOrNullObject("_Study");
        await context.sync();
        if (!metaSheet.isNullObject) {
            const vals = await getValues(metaSheet);
            if (vals && vals.length > 1) {
                study.metadata.protocolId = String(vals[1][0] || study.metadata.protocolId);
                study.metadata.studyName = String(vals[1][1] || study.metadata.studyName);
                study.metadata.version = String(vals[1][2] || study.metadata.version);
            }
        }
        runtime.reportProgress({ phase: 'metadata', completed: 1, total: 1, message: "Completed _Study metadata" });
        await runtime.yieldToHost();

        // 2. Parse _Codelists
        runtime.reportProgress({ phase: 'codelists', completed: 0, total: 1, message: "Reading _Codelists" });
        runtime.throwIfStopped('codelists');
        const clSheet = sheets.getItemOrNullObject("_Codelists");
        await context.sync();
        if (!clSheet.isNullObject) {
            const vals = await getValues(clSheet);
            if (vals) {
                const rows = vals.slice(1);
                runtime.reportProgress({ phase: 'codelists', completed: 0, total: rows.length, message: "Processing codelist rows" });
                await processRowsInChunks(rows, runtime, 'codelists', (row, rowIndex) => {
                    runtime.throwIfStopped('codelists');
                    const [id, name, code, decode] = row;
                    if (!id) return;
                    const strId = String(id).trim();
                    if (!study.codelists[strId]) {
                        study.codelists[strId] = { codelistId: strId, codelistName: String(name), dataType: DataType.TEXT, items: [] };
                    }
                    study.codelists[strId].items.push({
                        codelistId: strId, codedValue: String(code),
                        decodedText: { "en-US": String(decode) }, orderNumber: study.codelists[strId].items.length + 1
                    });
                    runtime.reportProgress({ phase: 'codelists', completed: rowIndex + 1, total: rows.length, message: "Processing codelist rows" });
                });
            }
        }
        runtime.reportProgress({ phase: 'codelists', completed: 1, total: 1, message: "Completed _Codelists" });

        // 3. Parse _Forms (The Registry)
        runtime.reportProgress({ phase: 'forms', completed: 0, total: 1, message: "Reading _Forms registry" });
        runtime.throwIfStopped('forms');
        const formSheet = sheets.getItemOrNullObject("_Forms");
        await context.sync();
        const activeFormOids: string[] = [];
        
        if (!formSheet.isNullObject) {
            const vals = await getValues(formSheet);
            if (vals) {
                const rows = vals.slice(1);
                await processRowsInChunks(rows, runtime, 'forms', (row, rowIndex) => {
                    runtime.throwIfStopped('forms');
                    const i = rowIndex + 1;
                    const [id, name, rep] = row;
                    if (!id) return;
                    const strId = String(id).trim();
                    activeFormOids.push(strId);
                    
                    study.forms[strId] = {
                        formOid: strId, formName: String(name), orderNumber: i,
                        repeating: String(rep).toLowerCase() === 'yes',
                        itemGroups: [{ groupOid: `${strId}_GRP`, name: "Default Group", repeating: false, orderNumber: 1, items: [] }],
                        effectiveVersion: study.metadata.version
                    };
                    runtime.reportProgress({ phase: 'forms', completed: rowIndex + 1, total: rows.length, message: "Processing forms registry" });
                });
            }
        }
        runtime.reportProgress({ phase: 'forms', completed: activeFormOids.length, total: activeFormOids.length || 1, message: "Completed _Forms registry" });

        // 4. Dynamic Multi-Pass: Parse Individual CRF Sheets
        for (let formIndex = 0; formIndex < activeFormOids.length; formIndex++) {
            runtime.throwIfStopped('items');
            const oid = activeFormOids[formIndex];
            runtime.reportProgress({
                phase: 'items',
                completed: formIndex,
                total: activeFormOids.length,
                message: `Reading form sheet ${oid} (${formIndex + 1}/${activeFormOids.length})`,
            });
            const crfSheet = sheets.getItemOrNullObject(oid);
            await context.sync();
            if (crfSheet.isNullObject) continue;

            try {
                const vals = await getValues(crfSheet);
                if (vals && vals.length > 1) {
                    const headers = vals[0] as string[];
                    const targetGroup = study.forms[oid].itemGroups[0];
                    const rows = vals.slice(1);

                    await processRowsInChunks(rows, runtime, 'items', (row, rowIndex) => {
                        runtime.throwIfStopped('items');
                        const item = mapRowToItem(headers, row, oid, rowIndex + 2); // +1 because Excel rows are 1-based, and +1 for header
                        if (item.itemOid) targetGroup.items.push(item as CrfItem);
                    });
                }
            } catch (error) {
                if (!allowPartialSheetFailures) throw error;
                parseWarnings.push(`Sheet "${oid}" failed to parse and was skipped: ${error instanceof Error ? error.message : String(error)}`);
            }
            runtime.reportProgress({
                phase: 'items',
                completed: formIndex + 1,
                total: activeFormOids.length || 1,
                message: `Processed form sheet ${oid} (${formIndex + 1}/${activeFormOids.length})`,
            });
            await runtime.yieldToHost();
        }

        // 5. Parse _Schedule (Transposing Matrix to Events)
        runtime.reportProgress({ phase: 'schedule', completed: 0, total: 1, message: "Reading _Schedule matrix" });
        runtime.throwIfStopped('schedule');
        const schedSheet = sheets.getItemOrNullObject("_Schedule");
        await context.sync();
        if (!schedSheet.isNullObject) {
            const vals = await getValues(schedSheet);
            if (vals && vals.length > 0) {
                const headers = vals[0];
                
                // Create Events based on Matrix Columns (Starting from Col 1)
                const scheduleColumns = Array.from({ length: Math.max(headers.length - 1, 0) }, (_, index) => index + 1);
                await processRowsInChunks(scheduleColumns, runtime, 'schedule', (col, colIndex) => {
                    runtime.throwIfStopped('schedule');
                    const eventName = String(headers[col]).trim();
                    if (!eventName) return;
                    
                    const eventOid = `VISIT_${col}`;
                    const event: StudyEvent = {
                        eventOid, eventName, orderNumber: col, eventType: EventType.SCHEDULED,
                        forms: [], rowIndex: 0 // Location tracker for schedule
                    } as any;
                    
                    // Look down the column for 'X'
                    for (let row = 1; row < vals.length; row++) {
                        const formOid = String(vals[row][0]).trim();
                        const marker = String(vals[row][col]).trim().toUpperCase();
                        
                        if (marker === 'X' || marker === '1') {
                            event.forms.push({ formOid, orderNumber: event.forms.length + 1, mandatory: true });
                        }
                    }
                    study.events.push(event);
                    runtime.reportProgress({ phase: 'schedule', completed: colIndex + 1, total: scheduleColumns.length || 1, message: "Processing schedule matrix" });
                });
            }
        }

        if (parseWarnings.length > 0) {
            study.metadata.customProperties = {
                ...(study.metadata.customProperties ?? {}),
                parseWarnings,
            };
        }

        runtime.reportProgress({ phase: 'complete', completed: 1, total: 1, message: "Workbook analysis completed" });

        return study;
    });
}

async function getValues(sheet: Excel.Worksheet) {
    const range = sheet.getUsedRange();
    range.load("values");
    await sheet.context.sync();
    return range.values;
}

function mapRowToItem(headers: string[], row: any[], formOid: string, excelRowIndex: number): Partial<CrfItem> {
    const item: any = { formOid, label: {}, validation: { required: false }, sdtmMapping: {}, rowIndex: excelRowIndex };
    headers.forEach((h, i) => {
        const val = row[i]; if (val === undefined || val === null || val === "") return;
        const ch = h.toLowerCase().trim();
        
        // Map to Matrix CRF Columns
        if (ch === 'variable name') { item.itemOid = String(val).trim().toUpperCase(); item.name = item.itemOid; }
        if (ch === 'label') item.label["en-US"] = String(val);
        if (ch === 'variable type') item.dataType = String(val).toLowerCase() as any;
        if (ch === 'required') item.validation.required = String(val).toLowerCase() === 'yes';
        if (ch === 'show if') item.showIf = String(val);
        if (ch === 'codelist id') item.codelistId = String(val).trim().toUpperCase();
    });
    return item;
}
