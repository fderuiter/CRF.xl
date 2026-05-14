import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from "docx";
import { StudyDesign } from "../../types";

export async function generateDocx(study: StudyDesign): Promise<void> {
    const children: any[] = [];

    // Global Header
    children.push(new Paragraph({ text: study.metadata.studyName, heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }));
    children.push(new Paragraph({ text: `Protocol: ${study.metadata.protocolId} | Version: ${study.metadata.version}`, alignment: AlignmentType.CENTER }));

    study.events.forEach(event => {
        event.forms.forEach(fRef => {
            const form = study.forms[fRef.formOid];
            if (!form) return;

            children.push(new Paragraph({ text: `\n${form.formName}`, heading: HeadingLevel.HEADING_2, pageBreakBefore: true }));
            children.push(new Paragraph({ text: "Subject ID: [ _ _ _ _ _ ]        Date of Visit: [ _ _ / _ _ _ / _ _ _ _ ]", alignment: AlignmentType.RIGHT }));

            form.itemGroups.forEach(group => {
                group.items.forEach(item => {
                    children.push(new Paragraph({ 
                        children: [
                            new TextRun({ text: `${item.label["en-US"] || item.name}: `, size: 24 }),
                            new TextRun({ text: " ____________________________", bold: true })
                        ],
                        spacing: { before: 200 }
                    }));
                });
            });

            // Sign-off block
            children.push(new Paragraph({ text: "\n\nInvestigator Signature: ______________________  Date: __________", alignment: AlignmentType.RIGHT }));
        });
    });

    const doc = new Document({ sections: [{ children }] });
    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${study.metadata.protocolId}_CRF.docx`;
    a.click();
}
