/* global Excel */
import { StudyDesign, DataType, CrfItem, EventType, StudyEvent } from '../types/index';

/**
 * The Matrix-First Parser Engine
 * 1. Reads global metadata & dictionaries.
 * 2. Reads the _Forms registry to map active CRF tabs.
 * 3. Loops through each CRF tab to harvest questions.
 * 4. Transposes the _Schedule grid into visit events.
 */
export async function parseExcelToStudyDesign(): Promise<StudyDesign> {
    return await Excel.run(async (context) => {
        const sheets = context.workbook.worksheets;
        const study: StudyDesign = {
            metadata: { protocolId: "PROT-XXXX", studyName: "Untitled", version: "1.0", defaultLanguage: "en-US" },
            events: [], forms: {}, codelists: {}
        };

        // 1. Parse _Study Metadata
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

        // 2. Parse _Codelists
        const clSheet = sheets.getItemOrNullObject("_Codelists");
        await context.sync();
        if (!clSheet.isNullObject) {
            const vals = await getValues(clSheet);
            if (vals) {
                for (let i = 1; i < vals.length; i++) {
                    const [id, name, code, decode] = vals[i];
                    if (!id) continue;
                    const strId = String(id).trim();
                    if (!study.codelists[strId]) {
                        study.codelists[strId] = { codelistId: strId, codelistName: String(name), dataType: DataType.TEXT, items: [] };
                    }
                    study.codelists[strId].items.push({
                        codelistId: strId, codedValue: String(code),
                        decodedText: { "en-US": String(decode) }, orderNumber: study.codelists[strId].items.length + 1
                    });
                }
            }
        }

        // 3. Parse _Forms (The Registry)
        const formSheet = sheets.getItemOrNullObject("_Forms");
        await context.sync();
        const activeFormOids: string[] = [];
        
        if (!formSheet.isNullObject) {
            const vals = await getValues(formSheet);
            if (vals) {
                for (let i = 1; i < vals.length; i++) {
                    const [id, name, rep, layout] = vals[i];
                    if (!id) continue;
                    const strId = String(id).trim();
                    activeFormOids.push(strId);
                    
                    study.forms[strId] = {
                        formOid: strId, formName: String(name), orderNumber: i,
                        repeating: String(rep).toLowerCase() === 'yes',
                        itemGroups: [{ groupOid: `${strId}_GRP`, name: "Default Group", repeating: false, orderNumber: 1, items: [] }],
                        effectiveVersion: study.metadata.version
                    };
                }
            }
        }

        // 4. Dynamic Multi-Pass: Parse Individual CRF Sheets
        for (const oid of activeFormOids) {
            const crfSheet = sheets.getItemOrNullObject(oid);
            await context.sync();
            if (crfSheet.isNullObject) continue;

            const vals = await getValues(crfSheet);
            if (vals && vals.length > 1) {
                const headers = vals[0] as string[];
                const targetGroup = study.forms[oid].itemGroups[0];

                for (let i = 1; i < vals.length; i++) {
                    const item = mapRowToItem(headers, vals[i], oid, i + 1); // +1 because Excel rows are 1-based, and +1 for header
                    if (item.itemOid) targetGroup.items.push(item as CrfItem);
                }
            }
        }

        // 5. Parse _Schedule (Transposing Matrix to Events)
        const schedSheet = sheets.getItemOrNullObject("_Schedule");
        await context.sync();
        if (!schedSheet.isNullObject) {
            const vals = await getValues(schedSheet);
            if (vals && vals.length > 0) {
                const headers = vals[0];
                
                // Create Events based on Matrix Columns (Starting from Col 1)
                for (let col = 1; col < headers.length; col++) {
                    const eventName = String(headers[col]).trim();
                    if (!eventName) continue;
                    
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
                }
            }
        }

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
