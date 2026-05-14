import { 
    Document, 
    Packer, 
    Paragraph, 
    TextRun, 
    Table, 
    TableRow, 
    TableCell, 
    WidthType, 
    AlignmentType, 
    HeadingLevel,
    PageOrientation,
    VerticalAlign,
    BorderStyle
} from "docx";
import { 
    StudyDesign, 
    CrfForm, 
    ItemGroup, 
    CrfItem, 
    PaperLayoutFormat, 
    DataType,
    PageLayout,
    GroupLayout,
    TranslatedText
} from "../../types/index";

/**
 * Main entry point for the Paper CRF Generation.
 * Orchestrates the conversion of clinical metadata into a handwriting-ready Word asset.
 */
export async function generateDocx(study: StudyDesign): Promise<void> {
    const sections = [];

    // Traverse the Study Design: Events -> Forms -> Groups -> Items
    for (const event of study.events) {
        for (const formRef of event.forms) {
            const form = study.forms[formRef.formOid];
            if (!form) continue;

            sections.push({
                properties: {
                    page: {
                        orientation: form.pageLayout === PageLayout.LANDSCAPE 
                            ? PageOrientation.LANDSCAPE 
                            : PageOrientation.PORTRAIT,
                    },
                },
                children: [
                    ...renderClinicalHeader(study, event.eventName, form),
                    ...renderFormContent(study, form),
                    ...renderInvestigatorSignature(form)
                ],
            });
        }
    }

    const doc = new Document({ 
        title: `${study.metadata.studyName} - Paper CRF`,
        sections 
    });

    // Finalize as Blob and trigger browser download
    const blob = await Packer.toBlob(doc);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${study.metadata.protocolId}_PaperCRF_v${study.metadata.version}.docx`;
    a.click();
    window.URL.revokeObjectURL(url);
}

/**
 * Renders the top block of every form (Protocol, Subject ID, Visit, Date).
 */
function renderClinicalHeader(study: StudyDesign, eventName: string, form: CrfForm): any[] {
    return [
        new Paragraph({
            text: study.metadata.studyName,
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
        }),
        new Paragraph({
            children: [
                new TextRun({ text: `Protocol ID: ${study.metadata.protocolId}`, bold: true }),
                new TextRun({ text: `  |  Version: ${study.metadata.version}`, color: "666666" })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 }
        }),
        new Paragraph({
            children: [
                new TextRun({ text: "SUBJECT ID: [ _ _ _ _ _ ]", bold: true }),
                new TextRun({ text: `        VISIT: ${eventName.toUpperCase()}`, bold: true })
            ],
            alignment: AlignmentType.RIGHT,
        }),
        new Paragraph({
            text: `FORM: ${form.formName}`,
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 400 },
            border: { bottom: { color: "000000", space: 1, style: BorderStyle.SINGLE, size: 6 } }
        })
    ];
}

/**
 * Iterates through ItemGroups and Items to generate questions and input areas.
 */
function renderFormContent(study: StudyDesign, form: CrfForm): any[] {
    const children: any[] = [];

    for (const group of form.itemGroups) {
        // Group Header
        if (group.label) {
            children.push(new Paragraph({
                children: [new TextRun({ text: getTranslation(group.label, study.metadata.defaultLanguage), bold: true, size: 24 })],
                spacing: { before: 200, after: 100 }
            }));
        }

        // Logic check: Repeating Groups (Logs) are rendered as Tables
        if (group.repeating || group.groupLayout === GroupLayout.MATRIX) {
            children.push(renderRepeatingTable(group, study.metadata.defaultLanguage));
        } else {
            // Standard vertical layout
            group.items.forEach(item => {
                children.push(...renderPhysicalItem(item, study));
            });
        }
    }

    return children;
}

/**
 * Renders an Item with physical handwriting affordances (lines, boxes, or scales).
 */
function renderPhysicalItem(item: CrfItem, study: StudyDesign): any[] {
    const lang = study.metadata.defaultLanguage;
    const labelText = getTranslation(item.label, lang);
    const children: any[] = [];

    // Main Question Paragraph
    const question = new Paragraph({
        spacing: { before: 150, after: 150 },
        children: [
            new TextRun({ text: labelText, size: 22 }),
            new TextRun({ text: "  " }),
            ...renderInputAffordance(item, study)
        ]
    });

    children.push(question);

    // Conditional Instruction Line
    if (item.instructions) {
        children.push(new Paragraph({
            children: [new TextRun({ text: `Instruction: ${getTranslation(item.instructions, lang)}`, italics: true, size: 18, color: "555555" })],
            spacing: { after: 100 }, indent: { left: 400 }
        }));
    }

    return children;
}

/**
 * Advanced Affordance Logic: Combines DataType and PaperLayoutFormat
 * to determine the correct physical UI (e.g., date boxes vs. VAS lines).
 */
function renderInputAffordance(item: CrfItem, study: StudyDesign): any[] {
    const affordances: any[] = [];
    const lang = study.metadata.defaultLanguage;

    switch (item.paperLayout) {
        case PaperLayoutFormat.COMB:
            // Render [ _ _ _ ] style fixed boxes
            const width = typeof item.displayWidth === 'number' ? item.displayWidth : 8;
            affordances.push(new TextRun({ text: " [ " + "_ ".repeat(width) + " ]", bold: true }));
            break;

        case PaperLayoutFormat.RADIO_LIST:
        case PaperLayoutFormat.CHECKBOX_LIST:
            // Render vertical choices with boxes
            affordances.push(new TextRun({ text: "\n", break: 1 }));
            const codelist = item.codelistId ? study.codelists[item.codelistId] : null;
            if (codelist) {
                codelist.items.forEach(clItem => {
                    affordances.push(new TextRun({ 
                        text: `   □ ${getTranslation(clItem.decodedText, lang)}\n`, 
                        break: 1 
                    }));
                });
            }
            break;

        case PaperLayoutFormat.VAS:
            // Render 10cm Visual Analog Scale
            affordances.push(new TextRun({ text: "\n", break: 1 }));
            affordances.push(new TextRun({ 
                text: "   (Min) |--------------------------------------------------| (Max)", 
                size: 20 
            }));
            break;

        default:
            // Specific handling for common Clinical Data Types
            if (item.dataType === DataType.DATE) {
                affordances.push(new TextRun({ text: " [ _ _ / _ _ _ / _ _ _ _ ] (DD/MMM/YYYY)", bold: true }));
            } else if (item.dataType === DataType.BOOLEAN) {
                affordances.push(new TextRun({ text: "  □ Yes    □ No", bold: true }));
            } else {
                // Standard blank line
                const len = item.dataType === DataType.INTEGER ? 10 : 35;
                affordances.push(new TextRun({ text: " " + "_".repeat(len), bold: true }));
            }
    }

    if (item.postText) {
        affordances.push(new TextRun({ text: ` ${getTranslation(item.postText, lang)}`, size: 20 }));
    }

    return affordances;
}

/**
 * Renders a Repeating Table for Logs (AE, ConMed, etc).
 */
function renderRepeatingTable(group: ItemGroup, defaultLang: string): Table {
    return new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
            // Header Row
            new TableRow({
                children: group.items.map(item => new TableCell({
                    children: [new Paragraph({ 
                        text: getTranslation(item.label, defaultLang).toUpperCase(), 
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 50, after: 50 }
                    })],
                    shading: { fill: "E0E0E0" },
                    verticalAlign: VerticalAlign.CENTER
                }))
            }),
            // Empty rows for handwriting (5 is standard for MVP)
            ...Array.from({ length: 5 }).map(() => new TableRow({
                height: { value: 600, rule: "atLeast" },
                children: group.items.map(() => new TableCell({ children: [] }))
            }))
        ],
    });
}

/**
 * Required FDA 21 CFR Part 11 footer for clinical forms.
 */
function renderInvestigatorSignature(form: CrfForm): any[] {
    return [
        new Paragraph({
            text: "",
            spacing: { before: 800 }
        }),
        new Paragraph({
            children: [
                new TextRun({ text: "Investigator Signature: ____________________________________", bold: true }),
                new TextRun({ text: "     Date: [ _ _ / _ _ _ / _ _ _ _ ]", bold: true })
            ],
            alignment: AlignmentType.RIGHT,
        }),
        new Paragraph({ children: [ new TextRun({ text: `By signing, I confirm that I have reviewed the data on this form (${form.formOid}) and it is complete and accurate.`, size: 16, color: "888888" }) ], alignment: AlignmentType.RIGHT })
    ];
}

/**
 * Utility to safely fetch translated text with a fallback.
 */
function getTranslation(textObj: TranslatedText, lang: string): string {
    return textObj[lang] || textObj["en-US"] || Object.values(textObj)[0] || "";
}
