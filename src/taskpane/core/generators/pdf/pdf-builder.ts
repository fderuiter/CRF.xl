/**
 * PDF Generator for Annotated CRFs
 * @issue #279, #90
 */
import { StudyDesign, isCrfItem } from "../../types/hierarchy";
import { AnnotatedCrfDocument } from "../../types/annotated-crf";
import { ExportOptions } from "../../types/linguistics";
import { DataType } from "../../types/enums";
import * as CryptoJS from "crypto-js";
import { formatDate } from "../../utils/locale-utils";
import { StudyDiffReport } from "../../types/diff";
import { buildStudyDiffList } from "../../../components/views/study-diff-view-utils";
import { generatePdfBlobFromHtml } from "../../services/pdf-export-adapter";
import { getTranslation } from "../shared-localization";

export interface PdfThemeColors {
  primary: string;
  success: string;
  warning: string;
  background: string;
}

const DEFAULT_THEME_COLORS: PdfThemeColors = {
  primary: "#1F77B4",
  success: "#2CA02C",
  warning: "#FF7F0E",
  background: "#eeeeee",
};

export async function generatePdfBlob(
  study: StudyDesign,
  validationIssues: any[] = [],
  auditSummary?: StudyDiffReport,
  exportOptions?: ExportOptions,
  annotatedCrfDoc?: AnnotatedCrfDocument,
  themeColors: PdfThemeColors = DEFAULT_THEME_COLORS
): Promise<Blob> {
  const protocolId = study.metadata.protocolId || "UNKNOWN";
  const timestamp = new Date().toISOString();

  const studyHashInput = JSON.stringify(study);
  const studyHash = CryptoJS.SHA256(studyHashInput).toString(CryptoJS.enc.Hex);

  const escapeHtml = (unsafe: string): string => {
    return (unsafe || "").toString().replace(/[&<"']/g, function (m) {
      switch (m) {
        case "&":
          return "&amp;";
        case "<":
          return "&lt;";
        case '"':
          return "&quot;";
        case "'":
          return "&#039;";
        default:
          return m;
      }
    });
  };

  let html = `<div style="font-family: sans-serif; font-size: 10px;">`;

  // Header
  html += `<h1 style="font-size: 24px; font-weight: bold; margin: 0 0 20px 0;">Reviewer Export - Annotated CRF</h1>`;
  html += `<div style="margin: 2px 0;">Protocol ID: ${escapeHtml(protocolId)}</div>`;
  html += `<div style="margin: 2px 0;">Study Version: ${escapeHtml(study.metadata.version || "UNKNOWN")}</div>`;
  html += `<div style="margin: 2px 0;">Exported At: ${escapeHtml(formatDate(timestamp))}</div>`;
  html += `<div style="margin: 2px 0 10px 0;">Study Cryptographic Hash: ${escapeHtml(studyHash)}</div>`;

  // Validation
  html += `<h2 style="font-size: 18px; font-weight: bold; margin: 15px 0 10px 0;">Validation Outcomes Summary</h2>`;
  if (validationIssues.length > 0) {
    html += `<ul>${validationIssues.map((v) => `<li>${escapeHtml(v.level)}: ${escapeHtml(v.message)}</li>`).join("")}</ul>`;
  } else {
    html += `<ul><li>No validation issues</li></ul>`;
  }

  // Audit Summary
  html += `<h2 style="font-size: 18px; font-weight: bold; margin: 15px 0 5px 0;">Audit Summary (Changes)</h2>`;
  if (auditSummary) {
    const diffEntries = buildStudyDiffList(auditSummary);
    if (diffEntries.length > 0) {
      html += `<table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <thead>
          <tr style="background-color: #f5f5f5; font-weight: bold;">
            <th style="border-bottom: 1px solid #ccc; padding: 4px; text-align: left;">Entity</th>
            <th style="border-bottom: 1px solid #ccc; padding: 4px; text-align: left;">Type</th>
            <th style="border-bottom: 1px solid #ccc; padding: 4px; text-align: left;">Change Class</th>
            <th style="border-bottom: 1px solid #ccc; padding: 4px; text-align: left;">Changed Fields</th>
          </tr>
        </thead>
        <tbody>`;
      diffEntries.forEach((e) => {
        const changedFieldsText =
          e.changedFields && e.changedFields.length > 0 ? e.changedFields.join(", ") : "-";
        html += `<tr>
          <td style="border-bottom: 1px solid #eee; padding: 4px;">${escapeHtml(e.title)}<br/>${escapeHtml(e.subtitle)}</td>
          <td style="border-bottom: 1px solid #eee; padding: 4px;">${escapeHtml(e.group)}</td>
          <td style="border-bottom: 1px solid #eee; padding: 4px;">${escapeHtml(e.changeClass.replace(/_/g, " "))}</td>
          <td style="border-bottom: 1px solid #eee; padding: 4px;">${escapeHtml(changedFieldsText)}</td>
        </tr>`;
      });
      html += `</tbody></table>`;
    } else {
      html += `<div>No changes detected.</div>`;
    }
  } else {
    html += `<div>No changes detected.</div>`;
  }

  html += `<div style="page-break-after: always; clear: both;"></div>`;

  for (const [formOid, form] of Object.entries(study.forms)) {
    html += `<h2 style="font-size: 12px; font-weight: bold; background-color: ${themeColors.background}; margin: 0 0 20px 0; padding: 5px;">Protocol ID: ${escapeHtml(protocolId)} | Form: ${escapeHtml(formOid)} (${escapeHtml(form.formName)}) | Subject: ____ | Visit: ____</h2>`;

    form.itemGroups.forEach((group) => {
      let groupHtml = `<div style="margin-bottom: 10px;">`;
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

          let bubbleColor = themeColors.primary;
          if (item.codelistId) {
            bubbleColor = themeColors.success;
          } else if (item.showIf || item.enableIf) {
            bubbleColor = themeColors.warning;
          }

          const sasName = item.sdtmMapping?.sasFieldName || item.itemOid;
          let sdtmDomain = item.sdtmMapping?.domain || "N/A";
          let sdtmVar = item.sdtmMapping?.variable || sasName || "N/A";
          let nciCode = item.sdtmMapping?.nciVariableCode || item.codelistId || "N/A";

          let metadataText = `[${item.itemOid}]\nDomain: ${sdtmDomain} | Var: ${sdtmVar} | NCI: ${nciCode}`;

          if (annotatedCrfDoc) {
            const docForm = annotatedCrfDoc.forms.find((f) => f.formOid === formOid);
            const docGroup = docForm?.itemGroups.find((g) => g.groupOid === group.groupOid);
            const docItem = docGroup?.items.find((i) => i.itemOid === item.itemOid);
            if (docItem && docItem.annotations.length > 0) {
              metadataText =
                `[${item.itemOid}]\n` +
                docItem.annotations.map((a) => `${a.label}: ${a.content}`).join("\n");
            }
          }

          const commentText = item.comment ? `\n${item.comment}` : "";
          const labelText = getTranslation(
            item.label,
            study.metadata.defaultLanguage,
            exportOptions
          );

          groupHtml += `
          <div style="display: flex; margin: 5px 0; gap: 10px; break-inside: avoid;">
            <div style="width: 150px;">${escapeHtml(labelText)}</div>
            <div style="width: 150px; font-family: monospace;">${escapeHtml(affordanceText)}</div>
            <div style="flex: 1; background-color: ${bubbleColor}; color: white; font-size: 8px; padding: 4px; white-space: pre-wrap;">${escapeHtml(metadataText + commentText)}</div>
          </div>`;
        }
      });
      groupHtml += `</div>`;
      html += groupHtml;
    });

    html += `<div style="page-break-after: always; clear: both;"></div>`;
  }

  html += `</div>`;

  return generatePdfBlobFromHtml(html);
}
