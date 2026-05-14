/* global Excel */
import { 
    StudyDesign, DataType, CrfItem, CrfForm, StudyEvent, Codelist, PaperLayoutFormat, RangeValueType 
} from '../types';

export async function parseExcelToStudyDesign(): Promise<StudyDesign> {
    return await Excel.run(async (context) => {
        const sheets = context.workbook.worksheets;
        const study: StudyDesign = {
            metadata: { protocolId: "PROT-001", studyName: "New Study", version: "1.0", defaultLanguage: "en-US" },
            events: [], forms: {}, codelists: {}
        };

        const itemSheet = sheets.getItemOrNullObject("Items");
        const formSheet = sheets.getItemOrNullObject("Forms");
        const eventSheet = sheets.getItemOrNullObject("Events");
        const metaSheet = sheets.getItemOrNullObject("Metadata");
        const clSheet = sheets.getItemOrNullObject("Codelists");
        await context.sync();

        // 1. Metadata Mapping
        if (!metaSheet.isNullObject) {
            const range = metaSheet.getUsedRange();
            range.load("values");
            await context.sync();
            const vals = range.values;
            if (vals && vals.length > 1) {
                study.metadata.protocolId = String(vals[1][0]);
                study.metadata.studyName = String(vals[1][1]);
                study.metadata.version = String(vals[1][2]);
            }
        }

        // 2. Codelist Aggregator (Multi-row support)
        if (!clSheet.isNullObject) {
            const range = clSheet.getUsedRange();
            range.load("values");
            await context.sync();
            const vals = range.values;
            if (vals) {
                for (let i = 1; i < vals.length; i++) {
                    const [id, name, val, dec, seq] = vals[i];
                    if (!id) continue;
                    if (!study.codelists[id]) {
                        study.codelists[id] = { codelistId: id, codelistName: name, dataType: DataType.TEXT, items: [] };
                    }
                    study.codelists[id].items.push({ 
                        codelistId: id, codedValue: String(val), decodedText: { "en-US": String(dec) }, orderNumber: Number(seq) 
                    });
                }
            }
        }

        // 3. Form Scaffolding
        if (!formSheet.isNullObject) {
            const range = formSheet.getUsedRange();
            range.load("values");
            await context.sync();
            const vals = range.values;
            if (vals) {
                for (let i = 1; i < vals.length; i++) {
                    const [id, name, seq, rep] = vals[i];
                    if (!id) continue;
                    study.forms[id] = { 
                        formOid: id, formName: name, orderNumber: Number(seq), repeating: rep === 'Yes', 
                        itemGroups: [], effectiveVersion: "1" 
                    };
                }
            }
        }

        // 4. Item Assembly & Script Capture
        if (!itemSheet.isNullObject) {
            const range = itemSheet.getUsedRange();
            range.load("values");
            await context.sync();
            const vals = range.values;
            if (vals) {
                const headers = vals[0] as string[];
                for (let i = 1; i < vals.length; i++) {
                    const item = mapRowToItem(headers, vals[i]);
                    if (item.formOid && study.forms[item.formOid]) {
                        const form = study.forms[item.formOid];
                        const gOid = item.groupOid || "DEFAULT_GROUP";
                        let group = form.itemGroups.find(g => g.groupOid === gOid);
                        if (!group) {
                            group = { groupOid: gOid, name: gOid, repeating: false, orderNumber: form.itemGroups.length + 1, items: [] };
                            form.itemGroups.push(group);
                        }
                        (item as any).rowIndex = i; // Tracking for navigation
                        group.items.push(item as CrfItem);
                    }
                }
            }
        }

        return study;
    });
}

function mapRowToItem(headers: string[], row: any[]): Partial<CrfItem> {
    const item: any = { label: {}, validation: { required: false, rangeChecks: [] }, sdtmMapping: {} };
    headers.forEach((h, i) => {
        const val = row[i];
        if (!val) return;
        const clean = h.toLowerCase().trim();
        if (clean === 'variable name') { item.itemOid = val; item.name = val; }
        if (clean === 'form') item.formOid = val;
        if (clean === 'page') item.groupOid = val;
        if (clean === 'label') item.label["en-US"] = val;
        if (clean === 'variable type') item.dataType = val as DataType;
        if (clean === 'sequence') item.orderNumber = Number(val);
        if (clean === 'show if') item.showIf = val.toString();
        if (clean === 'sas label') item.sdtmMapping.sasLabel = val;
        if (clean === 'catalog') item.codelistId = val;
    });
    return item;
}
