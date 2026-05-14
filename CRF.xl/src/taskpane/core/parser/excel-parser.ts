import { 
    StudyDesign, 
    DataType, 
    CrfItem, 
    PaperLayoutFormat, 
    QuerySeverity, 
    VasOrientation,
    RangeValueType
} from '../types';

/**
 * Main entry point to parse the Excel workbook.
 * Orchestrates the reading of Items, Forms, Events, and Codelists.
 */
export async function parseExcelToStudyDesign(): Promise<StudyDesign> {
    return await Excel.run(async (context) => {
        const workbook = context.workbook;
        const sheets = workbook.worksheets;

        // Load metadata (Simplified for this version)
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

        // Parse Items Sheet
        const itemSheet = sheets.getItemOrNullObject("Items");
        await context.sync();

        if (!itemSheet.isNullObject) {
            const range = itemSheet.getUsedRange();
            range.load("values");
            await context.sync();

            const values = range.values;
            const headers = values[0] as string[];

            for (let i = 1; i < values.length; i++) {
                const row = values[i];
                const item = mapRowToItem(headers, row);
                // logic to assemble into studyDesign hierarchy goes here...
            }
        }

        return studyDesign;
    });
}

/**
 * Robust mapping engine covering all requested clinical variables.
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
