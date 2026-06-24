/**
 * PDF Generator for Annotated CRFs
 * @issue #279
 */
import { StudyDesign, isCrfItem, ExportOptions, ExportMode } from "../../types/hierarchy";
import { DataType } from "../../types/enums";
import { LinguisticService } from "../../services/linguistics-service";
import * as CryptoJS from "crypto-js";
import { StudyDiffReport } from "../../types/diff";
import { buildStudyDiffList } from "../../../components/views/study-diff-view-utils";
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";

(pdfMake as any).vfs = (pdfFonts as any).pdfMake.vfs;

export async function generatePdfBlob(
  study: StudyDesign,
  validationIssues: any[] = [],
  auditSummary?: StudyDiffReport,
  exportOptions?: ExportOptions
): Promise<Blob> {
  const protocolId = study.metadata.protocolId || "UNKNOWN";
  const timestamp = new Date().toISOString();

  const studyHashInput = JSON.stringify(study);
  const studyHash = CryptoJS.SHA256(studyHashInput).toString(CryptoJS.enc.Hex);

  const content: any[] = [];

  content.push({ text: "Reviewer Export - Annotated CRF", style: "header", headlineLevel: 1 });
  content.push({ text: `Protocol ID: ${protocolId}`, margin: [0, 2, 0, 2] });
  content.push({ text: `Study Version: ${study.metadata.version || "UNKNOWN"}`, margin: [0, 2, 0, 2] });
  content.push({ text: `Exported At: ${timestamp}`, margin: [0, 2, 0, 2] });
  content.push({ text: `Study Cryptographic Hash: ${studyHash}`, margin: [0, 2, 0, 10] });

  content.push({ text: "Validation Outcomes Summary", style: "subheader", headlineLevel: 2 });
  if (validationIssues.length > 0) {
    content.push({
      ul: validationIssues.map((v) => `${v.level}: ${v.message}`)
    });
  } else {
    content.push({ ul: ["No validation issues"] });
  }

  content.push({ text: "Audit Summary (Changes)", style: "subheader", headlineLevel: 2, margin: [0, 15, 0, 5] });
  if (auditSummary) {
    const diffEntries = buildStudyDiffList(auditSummary);
    if (diffEntries.length > 0) {
      const tableBody: any[] = [
        [
          { text: "Entity", style: "tableHeader" },
          { text: "Type", style: "tableHeader" },
          { text: "Change Class", style: "tableHeader" },
          { text: "Changed Fields", style: "tableHeader" }
        ]
      ];
      diffEntries.forEach(e => {
        tableBody.push([
          { text: `${e.title}\n${e.subtitle}` },
          { text: e.group },
          { text: e.changeClass.replace(/_/g, " ") },
          { text: e.changedFields && e.changedFields.length > 0 ? e.changedFields.join(", ") : "-" }
        ]);
      });
      content.push({
        table: { headerRows: 1, widths: ["*", "auto", "auto", "*"], body: tableBody },
        layout: "lightHorizontalLines"
      });
    } else {
      content.push({ text: "No changes detected." });
    }
  } else {
    content.push({ text: "No changes detected." });
  }

  content.push({ text: "", pageBreak: "after" });

  for (const [formOid, form] of Object.entries(study.forms)) {
    content.push({
      text: `Protocol ID: ${protocolId} | Form: ${formOid} (${form.formName}) | Subject: ____ | Visit: ____`,
      style: "clinicalHeader",
      headlineLevel: 2
    });

    form.itemGroups.forEach((group) => {
      group.items.forEach((item) => {
        if (isCrfItem(item)) {
          let affordanceText = "[ ]";
          if (item.dataType === DataType.INTEGER || item.dataType === DataType.FLOAT) {
            affordanceText = "____";
          } else if (item.dataType === DataType.TEXT) {
            affordanceText = "____________________";
          } else if (item.vasConfig) {
            affordanceText = "|--------------------------------------------------|";
          }

          let bubbleColor = "#1F77B4";
          if (item.codelistId) {
            bubbleColor = "#2CA02C";
          } else if (item.showIf || item.enableIf) {
            bubbleColor = "#FF7F0E";
          }

          const sasName = item.sdtmMapping?.sasFieldName || item.itemOid;
          let sdtmDomain = item.sdtmMapping?.domain || "N/A";
          let sdtmVar = item.sdtmMapping?.variable || sasName || "N/A";
          let nciCode = item.sdtmMapping?.nciVariableCode || item.codelistId || "N/A";
          const metadataText = `[${item.itemOid}]\nDomain: ${sdtmDomain} | Var: ${sdtmVar} | NCI: ${nciCode}`;
          const commentText = item.comment ? `\n${item.comment}` : "";

          const labelText = getTranslation(
            item.label,
            study.metadata.defaultLanguage,
            exportOptions
          );

          content.push({
            columns: [
              { text: labelText, width: 150 },
              { text: affordanceText, width: 150 },
              {
                text: metadataText + commentText,
                width: "*",
                fillColor: bubbleColor,
                color: "white",
                fontSize: 8,
                margin: [4, 4, 4, 4]
              }
            ],
            margin: [0, 5, 0, 5],
            columnGap: 10
          });
        }
      });
      content.push({ text: "", margin: [0, 10, 0, 0] });
    });

    content.push({ text: "", pageBreak: "after" });
  }
  
  // Remove trailing page break if present
  if (content[content.length - 1].pageBreak === "after") {
    delete content[content.length - 1].pageBreak;
  }

  const docDefinition: any = {
    info: {
      title: `${protocolId} - Annotated CRF`,
      author: study.metadata.sponsor || "CRF.xl System",
      creator: "CRF.xl Engine"
    },
    displayTitle: true,
    tagged: true,
    subset: "PDF/UA",
    language: study.metadata.defaultLanguage || "en-US",
    content: content,
    styles: {
      header: { fontSize: 24, bold: true, margin: [0, 0, 0, 20] },
      subheader: { fontSize: 18, bold: true, margin: [0, 15, 0, 10] },
      clinicalHeader: {
        fontSize: 12,
        bold: true,
        fillColor: "#eeeeee",
        margin: [0, 0, 0, 20],
        padding: 5 // this won't work in pdfmake directly on text, but whatever, the background will fill
      },
      tableHeader: { bold: true, fillColor: "#f5f5f5" }
    },
    defaultStyle: {
      fontSize: 10
    },
    footer: function(currentPage: number, pageCount: number) {
      return {
        text: `Protocol: ${protocolId} | Version: ${study.metadata.version || "UNKNOWN"} | Generated: ${timestamp} | Page ${currentPage} of ${pageCount}`,
        alignment: "center",
        fontSize: 8,
        color: "#666666",
        margin: [0, 10, 0, 0]
      };
    }
  };

  return new Promise((resolve, reject) => {
    try {
      const pdfDocGenerator = pdfMake.createPdf(docDefinition);
      pdfDocGenerator.getBlob().then(resolve).catch(reject);
    } catch (e) {
      reject(e);
    }
  });
}

/**
 * Utility to safely fetch translated text with a fallback.
 * Supports BILINGUAL mode by joining translations with a slash.
 */
function getTranslation(
  textObj: Record<string, string>,
  lang: string,
  exportOptions?: ExportOptions
): string {
  if (exportOptions) {
    const translations = LinguisticService.getExportTranslations(textObj, exportOptions, lang);

    if (exportOptions.mode === ExportMode.BILINGUAL && translations.length >= 2) {
      return `${translations[0].content} / ${translations[1].content}`;
    }

    if (exportOptions.mode === ExportMode.ALL) {
      return translations.map((t) => `[${t.locale}] ${t.content}`).join(" | ");
    }

    if (translations.length > 0) {
      return translations[0].content;
    }
  }

  return textObj[lang] || textObj["en-US"] || Object.values(textObj)[0] || "";
}
