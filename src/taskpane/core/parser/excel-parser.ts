import { 
    StudyDesign, 
    DataType, 
    CrfItem, 
    PaperLayoutFormat, 
    QuerySeverity, 
    VasOrientation,
    RangeValueType,
    CrfForm,
    StudyEvent,
    Codelist,
    ItemGroup
} from '../types';

/**
 * Main entry point to parse the Excel workbook.
 * Orchestrates the reading of Items, Forms, Events, and Codelists
 * and assembles them into a hierarchical StudyDesign object.
 */
export async function parseExcelToStudyDesign(): Promise<StudyDesign> {
    return await Excel.run(async (context) => {
        const workbook = context.workbook;
        const sheets = workbook.worksheets;

        const studyDesign: StudyDesign = {
            metadata: {
                protocolId: "PROT-001",
                studyName: "Clinical Study Specification",
                version: "1.0.0",
                defaultLanguage: "en-US"
            },
            events: [],
            forms: {},
            codelists: {}
        };

        const itemSheet = sheets.getItemOrNullObject("Items");
        const formSheet = sheets.getItemOrNullObject("Forms");
        const eventSheet = sheets.getItemOrNullObject("Events");
        const codelistSheet = sheets.getItemOrNullObject("Codelists");
        await context.sync();

        // 1. Parse Forms Structure
        if (!formSheet.isNullObject) {
            const values = await getSheetValues(formSheet);
            if (values) {
                const headers = values[0] as string[];
                for (let i = 1; i < values.length; i++) {
                    const row = values[i];
                    const form = mapRowToForm(headers, row);
                    if (form.formOid) {
                        studyDesign.forms[form.formOid] = form as CrfForm;
                    }
                }
            }
        }

        // 2. Parse Items & Map Complex Scripts
        if (!itemSheet.isNullObject) {
            const values = await getSheetValues(itemSheet);
            if (values) {
                const headers = values[0] as string[];
                for (let i = 1; i < values.length; i++) {
                    const row = values[i];
                    const item = mapRowToItem(headers, row) as CrfItem;
                    
                    if (item.formOid && studyDesign.forms[item.formOid]) {
                        const targetForm = studyDesign.forms[item.formOid];
                        const groupOid = item.groupOid || "DEFAULT_GROUP";
                        
                        let group = targetForm.itemGroups.find(g => g.groupOid === groupOid);
                        if (!group) {
                            group = {
                                groupOid: groupOid,
                                name: groupOid,
                                repeating: false,
                                orderNumber: targetForm.itemGroups.length + 1,
                                items: []
                            };
                            targetForm.itemGroups.push(group);
                        }
                        group.items.push(item);
                    }
                }
            }
        }

        // 3. Parse Events
        if (!eventSheet.isNullObject) {
            const values = await getSheetValues(eventSheet);
            if (values) {
                const headers = values[0] as string[];
                for (let i = 1; i < values.length; i++) {
                    const row = values[i];
                    const event = mapRowToEvent(headers, row);
                    studyDesign.events.push(event as StudyEvent);
                }
            }
        }

        // Final sort for display integrity
        Object.values(studyDesign.forms).forEach(f => {
            f.itemGroups.sort((a, b) => a.orderNumber - b.orderNumber);
            f.itemGroups.forEach(g => g.items.sort((a, b) => a.orderNumber - b.orderNumber));
        });

        return studyDesign;
    });
}

async function getSheetValues(sheet: Excel.Worksheet): Promise<any[][] | null> {
    const range = sheet.getUsedRange();
    range.load("values");
    await sheet.context.sync();
    return range.values;
}

function mapRowToForm(headers: string[], row: any[]): Partial<CrfForm> {
    const form: any = { itemGroups: [] };
    headers.forEach((header, index) => {
        const val = row[index];
        if (!val) return;
        const h = header.trim().toLowerCase();
        if (h === 'form id' || h === 'form') form.formOid = val;
        if (h === 'form name') form.formName = val;
        if (h === 'show if' || h === 'logic') form.showIf = val.toString(); 
    });
    return form;
}

function mapRowToEvent(headers: string[], row: any[]): Partial<StudyEvent> {
    const event: any = { forms: [] };
    headers.forEach((header, index) => {
        const val = row[index];
        if (!val) return;
        const h = header.trim().toLowerCase();
        if (h === 'event id' || h === 'event') event.eventOid = val;
        if (h === 'event name') event.eventName = val;
        if (h === 'show if') event.showIf = val.toString();
        if (h === 'forms') {
            event.forms = val.toString().split(',').map((f: string, i: number) => ({
                formOid: f.trim(),
                orderNumber: i + 1,
                mandatory: true
            }));
        }
    });
    return event;
}

function mapRowToItem(headers: string[], row: any[]): Partial<CrfItem> {
    const item: any = {
        label: {},
        validation: { required: false, partialDateConfig: {}, rangeChecks: [] },
        sdtmMapping: {},
        vasConfig: {},
        derivation: { dependencyItemOids: [] }
    };

    headers.forEach((header, index) => {
        const val = row[index];
        if (val === undefined || val === null || val === "") return;

        const cleanHeader = header.trim().toLowerCase();

        switch (cleanHeader) {
            case 'form': item.formOid = val; break;
            case 'variable name': item.itemOid = val; item.name = val; break;
            case 'sequence': item.orderNumber = Number(val); break;
            case 'page': item.groupOid = val; break;
            case 'label': item.label["en-US"] = val; break;
            case 'variable type': item.dataType = mapDataType(val); break;

            // --- COMPLEX SCRIPT CAPTURE ---
            case 'show if': 
            case 'visibility logic':
            case 'branching':
                item.showIf = val.toString(); 
                break;

            case 'calculation':
            case 'derivation':
            case 'expression':
            case 'formula':
                item.derivation.expression = val.toString();
                break;

            case 'dependencies':
            case 'triggers':
            case 'target fields':
                item.derivation.dependencyItemOids = val.toString().split(',').map((s: string) => s.trim());
                break;

            case 'required if':
            case 'dynamic requirement':
                item.validation.requireIf = val.toString();
                break;

            case 'edit check logic':
            case 'validation script':
            case 'custom query logic':
                if (!item.editChecks) item.editChecks = [];
                item.editChecks.push({ 
                    logic: val.toString(), 
                    severity: QuerySeverity.QUERY, 
                    queryMessage: { "en-US": "Value failed programmatic validation check." } 
                });
                break;

            // --- STANDARD MAPPINGS ---
            case 'sas label': item.sdtmMapping.sasLabel = val; break;
            case 'required field': item.validation.required = (val.toString().toLowerCase() === 'yes'); break;
            case 'minimum value': item.validation.rangeChecks.push({ comparator: '>=', value: val, valueType: RangeValueType.LITERAL }); break;
            case 'maximum value': item.validation.rangeChecks.push({ comparator: '<=', value: val, valueType: RangeValueType.LITERAL }); break;
        }
    });

    return item;
}

function mapDataType(type: string): DataType {
    const t = type.toLowerCase();
    if (t.includes('text')) return DataType.TEXT;
    if (t.includes('integer')) return DataType.INTEGER;
    if (t.includes('float')) return DataType.FLOAT;
    if (t.includes('date')) return DataType.DATE;
    if (t.includes('codelist')) return DataType.CODELIST;
    return DataType.TEXT;
}
