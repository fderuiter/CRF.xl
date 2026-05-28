import * as pdfMake from "pdfmake/build/pdfmake";
import * as pdfFonts from "pdfmake/build/vfs_fonts";
import { StudyDesign, isCrfItem } from "../../types/hierarchy";
import { DataType } from "../../types/enums";
import * as CryptoJS from "crypto-js";

if ((pdfMake as any).vfs == null && (pdfFonts as any).pdfMake) {
  (pdfMake as any).vfs = (pdfFonts as any).pdfMake.vfs;
}

export function generatePdfBlob(study: StudyDesign, validationIssues: any[] = []): Promise<Blob> {
  return new Promise((resolve) => {
    const protocolId = study.metadata.protocolId || "UNKNOWN";
    const timestamp = new Date().toISOString();

    const studyHashInput = JSON.stringify(study);
    const studyHash = CryptoJS.SHA256(studyHashInput).toString(CryptoJS.enc.Hex);

    const docDefinition: any = {
      content: [
        { text: 'Reviewer Export - Annotated CRF', style: 'header' },
        { text: `Protocol ID: ${protocolId}`, style: 'subheader' },
        { text: `Exported At: ${timestamp}`, style: 'subheader' },
        { text: `Study Cryptographic Hash: ${studyHash}`, style: 'subheader' },
        { text: '\nValidation Outcomes Summary', style: 'subheader' },
        { ul: validationIssues.length > 0 ? validationIssues.map((v: any) => `${v.level}: ${v.message}`) : ['No validation issues'] },
        { text: '', pageBreak: 'after' }
      ],
      styles: {
        header: { fontSize: 18, bold: true, margin: [0, 0, 0, 10] },
        subheader: { fontSize: 14, bold: true, margin: [0, 10, 0, 5] },
        clinicalHeader: { fontSize: 12, bold: true, margin: [0, 0, 0, 10], fillColor: '#eeeeee' },
        variable: { fontSize: 10, margin: [0, 2, 0, 2] },
        bubbleBlue: { fontSize: 8, color: '#1F77B4', italics: true },
        bubbleGreen: { fontSize: 8, color: '#2CA02C', italics: true },
        bubbleOrange: { fontSize: 8, color: '#FF7F0E', italics: true },
        affordance: { fontSize: 10, margin: [0, 2, 0, 5], color: '#555555' }
      }
    };

    Object.entries(study.forms).forEach(([formOid, form], idx) => {
      // Page-per-Form
      if (idx > 0) {
        docDefinition.content.push({ text: '', pageBreak: 'before' });
      }

      // Clinical Header Block
      docDefinition.content.push({
        table: {
          widths: ['*'],
          body: [
            [{ text: `Protocol ID: ${protocolId} | Form: ${formOid} (${form.formName}) | Subject: ____ | Visit: ____`, style: 'clinicalHeader' }]
          ]
        },
        margin: [0, 0, 0, 15]
      });

      form.itemGroups.forEach(group => {
        group.items.forEach(item => {
          if (isCrfItem(item)) {
            // Determine callout bubble color
            let bubbleStyle = 'bubbleBlue'; // SDTM Variable Mappings (Default)
            if (item.codelistId) {
              bubbleStyle = 'bubbleGreen'; // Controlled Terminology Callouts
            } else if (item.showIf || item.enableIf) {
              bubbleStyle = 'bubbleOrange'; // Logic / Show If Conditions
            }
            const sasName = item.sdtmMapping?.sasFieldName || item.itemOid;

            // Affordances
            let affordanceText = '[   ]'; // Default Checkbox
            if (item.dataType === DataType.INTEGER || item.dataType === DataType.FLOAT) {
              affordanceText = '| | | |';
            } else if (item.dataType === DataType.TEXT) {
              affordanceText = '[                                        ]';
            } else if (item.vasConfig) {
              affordanceText = '|------------------------|';
            }

            docDefinition.content.push({
              text: [
                { text: `${item.name} `, style: 'variable' },
                { text: `[${item.itemOid}] (${sasName}) `, style: bubbleStyle },
                { text: affordanceText, style: 'affordance' }
              ],
              margin: [0, 5, 0, 5]
            });
          }
        });
      });
    });

    const pdfDocGenerator = (pdfMake as any).createPdf(docDefinition);
    pdfDocGenerator.getBlob((blob: Blob) => {
      resolve(blob);
    });
  });
}
