/* global Excel */
import { 
    StudyDesign, 
    DataType, 
    CrfItem, 
    EventType 
} from '../types/index';

export async function parseExcelToStudyDesign(): Promise<StudyDesign> {
    return await Excel.run(async (context) => {
        const sheets = context.workbook.worksheets;
        const study: StudyDesign = {
            metadata: { protocolId: "PROT-001", studyName: "New Clinical Study", version: "1.0", defaultLanguage: "en-US" },
            events: [], forms: {}, codelists: {}
        };

        const metaSheet = sheets.getItemOrNullObject("Metadata");
        const clSheet = sheets.getItemOrNullObject("Codelists");
        const formSheet = sheets.getItemOrNullObject("Forms");
        const itemSheet = sheets.getItemOrNullObject("Items");
        const eventSheet = sheets.getItemOrNullObject("Events");
        await context.sync();

        if (!metaSheet.isNullObject) {
            const vals = await getValues(metaSheet);
            if (vals && vals.length > 1) {
                study.metadata.protocolId = String(vals[1][0] || study.metadata.protocolId);
                study.metadata.studyName = String(vals[1][1] || study.metadata.studyName);
                study.metadata.version = String(vals[1][2] || study.metadata.version);
            }
        }

        if (!clSheet.isNullObject) {
            const vals = await getValues(clSheet);
            if (vals) {
                for (let i = 1; i < vals.length; i++) {
                    const [id, name, code, decode, seq] = vals[i];
                    if (!id) continue;
                    if (!study.codelists[id]) {
                        study.codelists[id] = { codelistId: id, codelistName: name, dataType: DataType.TEXT, items: [] };
                    }
                    study.codelists[id].items.push({
                        codelistId: id, codedValue: String(code),
                        decodedText: { "en-US": String(decode) }, orderNumber: Number(seq) || i
                    });
                }
            }
        }

        if (!formSheet.isNullObject) {
            const vals = await getValues(formSheet);
            if (vals) {
                for (let i = 1; i < vals.length; i++) {
                    const [id, name, seq, rep] = vals[i];
                    if (!id) continue;
                    study.forms[id] = {
                        formOid: id, formName: name, orderNumber: Number(seq) || i,
                        repeating: String(rep).toLowerCase() === 'yes',
                        itemGroups: [], effectiveVersion: study.metadata.version
                    };
                }
            }
        }

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
                            group = { groupOid: groupOid, name: groupOid, repeating: false, orderNumber: form.itemGroups.length + 1, items: [] };
                            form.itemGroups.push(group);
                        }
                        (item as any).rowIndex = i; 
                        group.items.push(item as CrfItem);
                    }
                }
            }
        }

        if (!eventSheet.isNullObject) {
            const vals = await getValues(eventSheet);
            if (vals) {
                for (let i = 1; i < vals.length; i++) {
                    const [id, name, seq, logic, formsCsv] = vals[i];
                    if (!id) continue;
                    study.events.push({
                        eventOid: id, eventName: name, orderNumber: Number(seq) || i,
                        eventType: EventType.SCHEDULED,
                        // Plumbing Fix: Capture rowIndex for Events
                        rowIndex: i,
                        forms: String(formsCsv).split(',').map((f, idx) => ({
                            formOid: f.trim(), orderNumber: idx + 1, mandatory: true
                        }))
                    } as any);
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

function mapRowToItem(headers: string[], row: any[]): Partial<CrfItem> {
    const item: any = { label: {}, validation: { required: false }, sdtmMapping: {} };
    headers.forEach((h, i) => {
        const val = row[i];
        if (val === undefined || val === null || val === "") return;
        const ch = h.toLowerCase().trim();
        if (ch === 'form') item.formOid = String(val);
        if (ch === 'page') item.groupOid = String(val);
        if (ch === 'variable name') { item.itemOid = String(val); item.name = String(val); }
        if (ch === 'label') item.label["en-US"] = String(val);
        if (ch === 'variable type') item.dataType = val as DataType;
        if (ch === 'sequence') item.orderNumber = Number(val);
        if (ch === 'sas label') item.sdtmMapping.sasLabel = String(val);
        if (ch === 'catalog') item.codelistId = String(val);
        if (ch === 'show if') item.showIf = String(val);
    });
    return item;
}
