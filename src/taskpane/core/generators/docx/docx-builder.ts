import { 
    Document, 
    Packer, 
    Paragraph, 
    TextRun, 
    Table, 
    TableRow, 
    TableCell, 
    WidthType, 
    BorderStyle, 
    AlignmentType, 
    HeadingLevel,
    PageOrientation,
    VerticalAlign
} from "docx";
import { 
    StudyDesign, 
    CrfForm, 
    ItemGroup, 
    CrfItem, 
    PaperLayoutFormat, 
    DataType,
    PageLayout 
} from "../../types";

/**
 * Main entry point for generating the Paper CRF.
 * Converts the StudyDesign payload into a downloadable .docx file.
 */
export async function generateDocx(studyDesign: StudyDesign): Promise<void> {
    const sections = [];

    // Iterate through Events (Visits)
    for (const event of studyDesign.events) {
        for (const formRef of event.forms) {
            const form = studyDesign.forms[formRef.formOid];
            if (!form) continue;

            sections.push({
                properties: {
                    page: {
                        orientation: form.pageLayout === PageLayout.LANDSCAPE 
                            ? PageOrientation.LANDSCAPE 
                            : PageOrientation.PORTRAIT,
                    },
                },
                children: renderForm(form, event.eventName),
            });
        }
    }

    const doc = new Document({ sections });

    // Generate Blob and trigger download
    const blob = await Packer.toBlob(doc);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${studyDesign.metadata.protocolId}_CRF_v${studyDesign.metadata.version}.docx`;
    a.click();
    window.URL.revokeObjectURL(url);
}

/**
 * Renders an entire Form (CRF Page).
 */
function renderForm(form: CrfForm, eventName: string): any[] {
    const children: any[] = [];

    // Header: Event Name & Form Title
    children.push(
        new Paragraph({
            text: eventName.toUpperCase(),
            heading: HeadingLevel.HEADING_2,
            alignment: AlignmentType.RIGHT,
        }),
        new Paragraph({
            text: form.formName,
            heading: HeadingLevel.HEADING_1,
            spacing: { after: 400 },
        })
    );

    // Render Item Groups
    for (const group of form.itemGroups) {
        children.push(...renderGroup(group));
    }

    return children;
}

/**
 * Renders a Group of items. 
 * If 'repeating' is true, it renders a table (Log). 
 * Otherwise, it renders vertical questions.
 */
function renderGroup(group: ItemGroup): any[] {
    const children: any[] = [];

    if (group.label) {
        children.push(
            new Paragraph({
                children: [new TextRun({ text: group.label["en-US"] || group.name, bold: true })],
                spacing: { before: 200, after: 100 },
            })
        );
    }

    if (group.repeating) {
        children.push(renderRepeatingTable(group));
    } else {
        group.items.forEach(item => {
            children.push(...renderItem(item));
        });
    }

    return children;
}

/**
 * Renders a standard non-repeating item (Question).
 */
function renderItem(item: CrfItem): any[] {
    const labelText = item.label["en-US"] || item.name;
    const children: any[] = [];

    const questionPara = new Paragraph({
        spacing: { before: 120, after: 120 },
        children: [
            new TextRun({ text: labelText, size: 22 }),
            new TextRun({ text: "  " }),
            ...renderInputAffordance(item)
        ]
    });

    children.push(questionPara);

    if (item.instructions) {
        children.push(new Paragraph({
            children: [new TextRun({ text: item.instructions["en-US"], italics: true, size: 18, color: "666666" })],
            spacing: { after: 100 }
        }));
    }

    return children;
}

/**
 * Renders the physical input area (lines, boxes, scales).
 */
function renderInputAffordance(item: CrfItem): any[] {
    const affordances: any[] = [];

    switch (item.paperLayout) {
        case PaperLayoutFormat.COMB:
            const charCount = typeof item.displayWidth === 'number' ? item.displayWidth : 10;
            affordances.push(new TextRun({ text: " [ " + "_ ".repeat(charCount) + " ]", bold: true }));
            break;

        case PaperLayoutFormat.CHECKBOX_LIST:
        case PaperLayoutFormat.RADIO_LIST:
            affordances.push(new TextRun({ text: "\n", break: 1 }));
            // Mocking codelist options for paper
            ["Yes", "No", "Unknown"].forEach(opt => {
                affordances.push(new TextRun({ text: "   □ " + opt + "\n", break: 1 }));
            });
            break;

        case PaperLayoutFormat.VAS:
            affordances.push(new TextRun({ text: "\n", break: 1 }));
            affordances.push(new TextRun({ text: "   (Min) |--------------------------------------------------| (Max)", size: 20 }));
            break;

        default:
            // Standard handwriting line
            const lineLength = item.dataType === DataType.INTEGER ? 10 : 30;
            affordances.push(new TextRun({ text: " " + "_".repeat(lineLength), bold: true }));
    }

    if (item.postText) {
        affordances.push(new TextRun({ text: " " + item.postText["en-US"], size: 20 }));
    }

    return affordances;
}

/**
 * Renders a Grid/Table for repeating data (Logs).
 */
function renderRepeatingTable(group: ItemGroup): Table {
    const headerRow = new TableRow({
        children: group.items.map(item => new TableCell({
            children: [new Paragraph({ text: item.label["en-US"] || item.name, style: "small", alignment: AlignmentType.CENTER })],
            shading: { fill: "F2F2F2" },
            verticalAlign: VerticalAlign.CENTER
        }))
    });

    const emptyRows = Array.from({ length: 5 }).map(() => new TableRow({
        height: { value: 400, rule: "atLeast" },
        children: group.items.map(() => new TableCell({ children: [] }))
    }));

    return new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [headerRow, ...emptyRows],
    });
}
