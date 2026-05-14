/* global Excel */
import { 
    StudyDesign, DataType, CrfItem, CrfForm, StudyEvent, Codelist, PaperLayoutFormat, VasOrientation, RangeValueType 
} from '../types';

export async function parseExcelToStudyDesign(): Promise<StudyDesign> {
    return await Excel.run(async (context) => {
        const sheets = context.workbook.worksheets;
        const studyDesign: StudyDesign = {
            metadata: { protocolId: "PROT-001", studyName: "New Study", version: "1.0.0", defaultLanguage: "en-US" },
            events: [], forms: {}, codelists: {}
        };

        const itemSheet = sheets.getItemOrNullObject("Items");
        const formSheet = sheets.getItemOrNullObject("Forms");
        const eventSheet = sheets.getItemOrNullObject("Events");
        const metaSheet = sheets.getItemOrNullObject("Metadata");
        const clSheet = sheets.getItemOrNullObject("Codelists");
        await context.sync();

        // Parse Metadata
        if (!metaSheet.isNullObject) {
            const vals = await getSheetValues(metaSheet);
            if (vals && vals.length > 1) {
                studyDesign.metadata.protocolId = vals[1][0];
                studyDesign.metadata.studyName = vals[1][1];
                studyDesign.metadata.version = vals[1][2];
            }
        }

        // Parse Codelists (Grouped)
        if (!clSheet.isNullObject) {
            const vals = await getSheetValues(clSheet);
            if (vals) {
                for (let i = 1; i < vals.length; i++) {
                    const [id, name, val, dec, seq] = vals[i];
                    if (!studyDesign.codelists[id]) {
                        studyDesign.codelists[id] = { codelistId: id, codelistName: name, dataType: DataType.TEXT, items: [] };
                    }
                    studyDesign.codelists[id].items.push({ 
                        codelistId: id, codedValue: val, decodedText: { "en-US": dec }, orderNumber: Number(seq) 
                    });
                }
            }
        }

        // Parse Forms
        if (!formSheet.isNullObject) {
            const vals = await getSheetValues(formSheet);
            if (vals) {
                for (let i = 1; i < vals.length; i++) {
                    const [id, name, seq, rep, logic] = vals[i];
                    studyDesign.forms[id] = { 
                        formOid: id, formName: name, orderNumber: Number(seq), 
                        repeating: rep === 'Yes', itemGroups: [], effectiveVersion: "1" 
                    };
                }
            }
        }

        // Parse Items & Assemble
        if (!itemSheet.isNullObject) {
            const vals = await getSheetValues(itemSheet);
            if (vals) {
                const headers = vals[0] as string[];
                for (let i = 1; i < vals.length; i++) {
                    const item = mapRowToItem(headers, vals[i]);
                    if (item.formOid && studyDesign.forms[item.formOid]) {
                        const form = studyDesign.forms[item.formOid];
                        const gOid = item.groupOid || "DEFAULT";
                        let group = form.itemGroups.find(g => g.groupOid === gOid);
                        if (!group) {
                            group = { groupOid: gOid, name: gOid, repeating: false, orderNumber: form.itemGroups.length + 1, items: [] };
                            form.itemGroups.push(group);
                        }
                        (item as any).rowIndex = i; // Save for navigation
                        group.items.push(item as CrfItem);
                    }
                }
            }
        }

        // Parse Events
        if (!eventSheet.isNullObject) {
            const vals = await getSheetValues(eventSheet);
            if (vals) {
                for (let i = 1; i < vals.length; i++) {
                    const [id, name, seq, logic, forms] = vals[i];
                    studyDesign.events.push({
                        eventOid: id, eventName: name, orderNumber: Number(seq), eventType: any,
                        forms: forms.split(',').map((f: string, idx: number) => ({ formOid: f.trim(), orderNumber: idx + 1, mandatory: true }))
                    } as any);
                }
            }
        }

        return studyDesign;
    });
}

async function getSheetValues(sheet: Excel.Worksheet) {
    const range = sheet.getUsedRange();
    range.load("values");
    await sheet.context.sync();
    return range.values;
}

function mapRowToItem(headers: string[], row: any[]): Partial<CrfItem> {
    const item: any = { label: {}, validation: { required: false, rangeChecks: [] }, sdtmMapping: {} };
    headers.forEach((h, i) => {
        const val = row[i];
        if (!val) return;
        const clean = h.toLowerCase();
        if (clean.includes('variable name')) { item.itemOid = val; item.name = val; }
        if (clean === 'form') item.formOid = val;
        if (clean === 'page') item.groupOid = val;
        if (clean === 'label') item.label["en-US"] = val;
        if (clean === 'variable type') item.dataType = val as any;
        if (clean === 'sequence') item.orderNumber = Number(val);
        if (clean === 'show if') item.showIf = val.toString();
    });
    return item;
}
