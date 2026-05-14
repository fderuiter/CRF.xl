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

        // 1. Initialize StudyDesign with default metadata
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

        // 2. Load all necessary sheets
        const itemSheet = sheets.getItemOrNullObject("Items");
        const formSheet = sheets.getItemOrNullObject("Forms");
        const eventSheet = sheets.getItemOrNullObject("Events");
        const codelistSheet = sheets.getItemOrNullObject("Codelists");
        await context.sync();

        // 3. Parse Codelists First (Referenced by Items)
        if (!codelistSheet.isNullObject) {
            const values = await getSheetValues(codelistSheet);
            if (values) {
                const headers = values[0] as string[];
                for (let i = 1; i < values.length; i++) {
                    const row = values[i];
                    // Logic to populate studyDesign.codelists
                    // (Simplified: assuming ID and values are present)
                }
            }
        }

        // 4. Parse Forms & Groups
        // We create the structure first so items have a place to land
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

        // 5. Parse Items and Assemble into Groups/Forms
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
                        
                        // Find or create the ItemGroup
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

        // 6. Parse Events and link to Forms
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

        // 7. Sort items within groups by orderNumber
        Object.values(studyDesign.forms).forEach(form => {
            form.itemGroups.forEach(group => {
                group.items.sort((a, b) => (a.orderNumber || 0) - (b.orderNumber || 0));
            });
            form.itemGroups.sort((a, b) => a.orderNumber - b.orderNumber);
        });

        return studyDesign;
    });
}

/**
 * Helper to get values from a sheet safely.
 */
async function getSheetValues(sheet: Excel.Worksheet): Promise<any[][] | null> {
    const range = sheet.getUsedRange();
    range.load("values");
    await sheet.context.sync();
    return range.values;
}

/**
 * Maps a row from the 'Forms' sheet.
 */
function mapRowToForm(headers: string[], row: any[]): Partial<CrfForm> {
    const form: any = { itemGroups: [] };
    headers.forEach((header, index) => {
        const val = row[index];
        if (!val) return;
        const h = header.trim().toLowerCase();
        if (h === 'form id' || h === 'form') form.formOid = val;
        if (h === 'form name' || h === 'name') form.formName = val;
        if (h === 'repeating') form.repeating = (val.toString().toLowerCase() === 'yes');
        if (h === 'sequence') form.orderNumber = Number(val);
    });
    return form;
}

/**
 * Maps a row from the 'Events' sheet.
 */
function mapRowToEvent(headers: string[], row: any[]): Partial<StudyEvent> {
    const event: any = { forms: [] };
    headers.forEach((header, index) => {
        const val = row[index];
        if (!val) return;
        const h = header.trim().toLowerCase();
        if (h === 'event id' || h === 'event') event.eventOid = val;
        if (h === 'event name' || h === 'name') event.eventName = val;
        if (h === 'sequence') event.orderNumber = Number(val);
        if (h === 'forms') {
            const formList = val.toString().split(',');
            event.forms = formList.map((f: string, idx: number) => ({
                formOid: f.trim(),
                orderNumber: idx + 1,
                mandatory: true
            }));
        }
    });
    return event;
}

/**
 * Robust mapping engine covering all requested clinical variables for Items.
 */
function mapRowToItem(headers: string[], row: any[]): Partial<CrfItem> {
    const item: any = {
        label: {},
        validation: {
            required: false,
            partialDateConfig: {},
            rangeChecks: []
        },
        sdtmMapping: {},
        vasConfig: {},
        permissions: { blindedRoles: [] }
    };

    headers.forEach((header, index) => {
        const val = row[index];
        if (val === undefined || val === null || val === "") return;

        const cleanHeader = header.trim().toLowerCase();

        switch (cleanHeader) {
            // Identity & Hierarchy
            case 'form': item.formOid = val; break;
            case 'variable name': item.itemOid = val; item.name = val; break;
            case 'sequence': item.orderNumber = Number(val); break;
            case 'page': item.groupOid = val; break;

            // Labels & UI
            case 'label': item.label["en-US"] = val; break;
            case 'suffix': case 'time suffix': item.postText = { "en-US": val }; break;
            case 'width': item.displayWidth = val; break;
            case 'height': item.displayLines = Number(val); break;
            case 'radio orientation': 
                item.paperLayout = val.toLowerCase() === 'inline' ? PaperLayoutFormat.RADIO_INLINE : PaperLayoutFormat.RADIO_LIST;
                break;

            // Types & Codelists
            case 'variable type': item.dataType = mapDataType(val); break;
            case 'catalog': case 'special: country': item.codelistId = val; break;

            // SAS & Regulatory
            case 'sas label': item.sdtmMapping.sasLabel = val; break;
            case 'blinded roles': item.permissions.blindedRoles = val.split(',').map((s: string) => s.trim()); break;
            case 'sdv required': item.sdvTier = val.toLowerCase() === 'yes' ? '100%' : 'None'; break;

            // Validations & Constraints
            case 'required field': item.validation.required = (val.toLowerCase() === 'yes'); break;
            case 'whole numbers only': if (val.toLowerCase() === 'yes') item.dataType = DataType.INTEGER; break;
            case 'length': item.validation.maxLength = Number(val); break;
            case 'allow future dates': item.validation.allowFutureDates = (val.toLowerCase() === 'yes'); break;
            case 'minimum value': item.validation.rangeChecks.push({ comparator: '>=', value: val, valueType: RangeValueType.LITERAL }); break;
            case 'maximum value': item.validation.rangeChecks.push({ comparator: '<=', value: val, valueType: RangeValueType.LITERAL }); break;

            // Special Field Masks
            case 'special: password': item.isPasswordBox = (val.toLowerCase() === 'yes'); break;
            case 'special: hidden': item.isHidden = (val.toLowerCase() === 'yes'); break;
            case 'special: timezone': item.captureTimezone = (val.toLowerCase() === 'yes'); break;
            case 'special: email': item.validation.regexPattern = "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$"; break;

            // Partial Dates & Imputation
            case 'allow partial dd': item.validation.partialDateConfig.allowPartialDD = true; break;
            case 'allow partial mmm': item.validation.partialDateConfig.allowPartialMMM = true; break;
            case 'allow partial yyyy': item.validation.partialDateConfig.allowPartialYYYY = true; break;
            case 'partial dd text': item.validation.partialDateConfig.partialDDText = val; break;
            case 'impute dd': item.validation.partialDateConfig.imputeDD = val; break;
            case 'impute mmm': item.validation.partialDateConfig.imputeMMM = val; break;
            case 'impute yyyy': item.validation.partialDateConfig.imputeYYYY = val; break;

            // Time Controls
            case 'precision time': item.timePrecision = 'HH:mm'; break;
            case 'precision seconds': item.timePrecision = 'HH:mm:ss'; break;

            // Reporting
            case 'report text: checked': item.exportTextChecked = val; break;
            case 'report text: unchecked': item.exportTextUnchecked = val; break;

            // Files
            case 'maximum # files': item.validation.maxFiles = Number(val); break;
            case 'maximum file size': item.validation.maxFileSizeMb = Number(val); break;

            // Sliders
            case 'slider orientation': item.vasConfig.orientation = val.toLowerCase() === 'vertical' ? VasOrientation.VERTICAL : VasOrientation.HORIZONTAL; break;
            case 'value step': item.vasConfig.step = Number(val); break;
            case 'minor tick step': item.vasConfig.minorTickStep = Number(val); break;
            case 'major tick step': item.vasConfig.majorTickStep = Number(val); break;

            // Workflows
            case 'comments': item.allowInvestigatorComment = (val.toLowerCase() === 'yes'); break;
            case 'is expiration': item.isExpiration = (val.toLowerCase() === 'yes'); break;
        }
    });

    return item;
}

/**
 * Maps Excel strings to the strict DataType enum.
 */
function mapDataType(type: string): DataType {
    const t = type.toLowerCase();
    if (t.includes('text')) return DataType.TEXT;
    if (t.includes('integer')) return DataType.INTEGER;
    if (t.includes('float')) return DataType.FLOAT;
    if (t.includes('date')) return DataType.DATE;
    if (t.includes('time')) return DataType.TIME;
    if (t.includes('codelist') || t.includes('radio') || t.includes('check')) return DataType.CODELIST;
    if (t.includes('file')) return DataType.FILE;
    return DataType.TEXT;
}
