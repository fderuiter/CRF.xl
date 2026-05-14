/* global Excel */
import { 
    StudyDesign, 
    DataType, 
    CrfItem, 
    CrfForm, 
    StudyEvent, 
    EventType 
} from '../types';

/**
 * Main entry point to parse the Excel workbook.
 * Orchestrates the reading of five core sheets and assembles the hierarchical StudyDesign.
 */
export async function parseExcelToStudyDesign(): Promise<StudyDesign> {
    return await Excel.run(async (context) => {
        const sheets = context.workbook.worksheets;
        const study: StudyDesign = {
            metadata: { 
                protocolId: "PROT-001", 
                studyName: "New Clinical Study", 
                version: "1.0", 
                defaultLanguage: "en-US" 
            },
            events: [], 
            forms: {}, 
            codelists: {}
        };

        // 1. Identify Mandatory Sheets
        const metaSheet = sheets.getItemOrNullObject("Metadata");
        const clSheet = sheets.getItemOrNullObject("Codelists");
        const formSheet = sheets.getItemOrNullObject("Forms");
        const itemSheet = sheets.getItemOrNullObject("Items");
        const eventSheet = sheets.getItemOrNullObject("Events");
        await context.sync();

        // 2. Parse Metadata
        if (!metaSheet.isNullObject) {
            const vals = await getValues(metaSheet);
            if (vals && vals.length > 1) {
                study.metadata.protocolId = String(vals[1][0] || study.metadata.protocolId);
                study.metadata.studyName = String(vals[1][1] || study.metadata.studyName);
                study.metadata.version = String(vals[1][2] || study.metadata.version);
                study.metadata.defaultLanguage = String(vals[1][3] || study.metadata.defaultLanguage);
            }
        }

        // 3. Parse Codelists (Aggregation Logic for multi-row entries)
        if (!clSheet.isNullObject) {
            const vals = await getValues(clSheet);
            if (vals) {
                for (let i = 1; i < vals.length; i++) {
                    const [id, name, code, decode, seq] = vals[i];
                    if (!id) continue;
                    if (!study.codelists[id]) {
                        study.codelists[id] = { 
                            codelistId: id, 
                            codelistName: name, 
                            dataType: DataType.TEXT, 
                            items: [] 
                        };
                    }
                    study.codelists[id].items.push({
                        codelistId: id,
                        codedValue: String(code),
                        decodedText: { "en-US": String(decode) },
                        orderNumber: Number(seq) || i
                    });
                }
            }
        }

        // 4. Parse Forms (Shells)
        if (!formSheet.isNullObject) {
            const vals = await getValues(formSheet);
            if (vals) {
                for (let i = 1; i < vals.length; i++) {
                    const [id, name, seq, rep] = vals[i];
                    if (!id) continue;
                    study.forms[id] = {
                        formOid: id,
                        formName: name,
                        orderNumber: Number(seq) || i,
                        repeating: String(rep).toLowerCase() === 'yes',
                        itemGroups: [],
                        effectiveVersion: study.metadata.version
                    };
                }
            }
        }

        // 5. Parse Items & Grouping Logic
        if (!itemSheet.isNullObject) {
            const vals = await getValues(itemSheet);
            if (vals) {
                const headers = vals[0] as string[];
                for (let i = 1; i < vals.length; i++) {
                    const item = mapRowToItem(headers, vals[i]);
                    if (item.formOid && study.forms[item.formOid]) {
                        const form = study.forms[item.formOid];
                        const groupOid = item.groupOid || "DEFAULT";
                        
                        let group = form.itemGroups.find(g => g.groupOid === groupOid);
                        if (!group) {
                            group = {
                                groupOid: groupOid,
                                name: groupOid,
                                repeating: false,
                                orderNumber: form.itemGroups.length + 1,
                                items: []
                            };
                            form.itemGroups.push(group);
                        }
                        // Record rowIndex (1-based index with header offset) for UI Inspector
                        (item as any).rowIndex = i; 
                        group.items.push(item as CrfItem);
                    }
                }
            }
        }

        // 6. Parse Events (Visit Schedule)
        if (!eventSheet.isNullObject) {
            const vals = await getValues(eventSheet);
            if (vals) {
                for (let i = 1; i < vals.length; i++) {
                    const [id, name, seq, logic, formsCsv] = vals[i];
                    if (!id) continue;
                    study.events.push({
                        eventOid: id,
                        eventName: name,
                        orderNumber: Number(seq) || i,
                        eventType: EventType.SCHEDULED,
                        forms: String(formsCsv).split(',').map((f, idx) => ({
                            formOid: f.trim(),
                            orderNumber: idx + 1,
                            mandatory: true
                        }))
                    });
                }
            }
        }

        return study;
    });
}

/**
 * Helper to fetch values from a sheet's used range.
 */
async function getValues(sheet: Excel.Worksheet): Promise<any[][] | null> {
    const range = sheet.getUsedRange();
    range.load("values");
    await sheet.context.sync();
    return range.values;
}

/**
 * Maps a tabular row to the structured CrfItem type.
 */
function mapRowToItem(headers: string[], row: any[]): Partial<CrfItem> {
    const item: any = { 
        label: {}, 
        validation: { required: false }, 
        sdtmMapping: {} 
    };

    headers.forEach((h, i) => {
        const val = row[i];
        if (val === undefined || val === null || val === "") return;
        
        const cleanHeader = h.toLowerCase().trim();
        if (cleanHeader === 'form') item.formOid = String(val);
        if (cleanHeader === 'page') item.groupOid = String(val);
        if (cleanHeader === 'variable name') { item.itemOid = String(val); item.name = String(val); }
        if (cleanHeader === 'label') item.label["en-US"] = String(val);
        if (cleanHeader === 'variable type') item.dataType = val as DataType;
        if (cleanHeader === 'sequence') item.orderNumber = Number(val);
        if (cleanHeader === 'sas label') item.sdtmMapping.sasLabel = String(val);
        if (cleanHeader === 'catalog' || cleanHeader === 'codelist id') item.codelistId = String(val);
        if (cleanHeader === 'show if') item.showIf = String(val);
    });

    return item;
}
