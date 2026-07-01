/**
 * @issue #78
 */
import {
  StudyDesign,
  isCrfItem,
  AnnotatedCrfDocument,
  AcrfForm,
  AcrfItemGroup,
  AcrfItem,
  AcrfAnnotation,
  AcrfAnnotationType,
} from "../types";
import { formatDate } from "../utils/locale-utils";

/**
 * Builds an AnnotatedCrfDocument from a StudyDesign.
 */
export function buildAnnotatedCrfDocument(
  study: StudyDesign,
  validationIssues: any[] = []
): AnnotatedCrfDocument {
  const protocolId = study.metadata.protocolId || "UNKNOWN";
  const forms: AcrfForm[] = [];

  for (const [formOid, form] of Object.entries(study.forms)) {
    const itemGroups: AcrfItemGroup[] = [];

    for (const group of form.itemGroups) {
      const items: AcrfItem[] = [];

      for (const item of group.items) {
        if (isCrfItem(item)) {
          const annotations: AcrfAnnotation[] = [];

          // 1. SDTM Annotation
          if (item.sdtmMapping) {
            const domain = item.sdtmMapping.domain || "N/A";
            const variable = item.sdtmMapping.variable || "N/A";
            annotations.push({
              type: AcrfAnnotationType.SDTM,
              label: "SDTM",
              content: `${domain}.${variable}`,
              commentOid: item.sdtmMapping.commentOid,
              color: "#d32f2f", // Red for SDTM
            });
          }

          // 2. ADaM Annotation
          if (item.adamMapping) {
            const dataset = item.adamMapping.dataset || "N/A";
            const variable = item.adamMapping.variable || "N/A";
            annotations.push({
              type: AcrfAnnotationType.ADAM,
              label: "ADaM",
              content: `${dataset}.${variable}`,
              commentOid: item.adamMapping.commentOid,
              color: "#7b1fa2", // Purple for ADaM
            });
          }

          // 3. Rule Annotation
          if (study.rules) {
            const itemRules = study.rules.filter(
              (r) => r.target?.toLowerCase() === item.itemOid.toLowerCase()
            );
            itemRules.forEach((rule) => {
              annotations.push({
                type: AcrfAnnotationType.RULE,
                label: "Rule",
                content: rule.ruleId,
                color: "#f57c00", // Orange for Rule
              });
            });
          }

          // 4. Validation Issues
          const itemIssues = validationIssues.filter(
            (v) =>
              v.sheetName === formOid &&
              (v.location?.includes(item.itemOid) || v.rowIndex === (item as any).rowIndex)
          );
          itemIssues.forEach((issue) => {
            annotations.push({
              type: AcrfAnnotationType.VALIDATION,
              label: issue.level,
              content: issue.message,
              color: issue.level === "Error" ? "#c62828" : "#fbc02d",
            });
          });

          items.push({
            itemOid: item.itemOid,
            name: item.name,
            label: item.label,
            dataType: item.dataType,
            mandatory: !!item.validation?.required,
            codelistId: item.codelistId,
            instructions: item.instructions,
            annotations,
          });
        }
      }

      itemGroups.push({
        groupOid: group.groupOid,
        name: group.name,
        label: group.label,
        items,
      });
    }

    forms.push({
      formOid,
      formName: form.formName,
      itemGroups,
    });
  }

  return {
    protocolId,
    studyName: study.metadata.studyName,
    version: study.metadata.version,
    sponsor: study.metadata.sponsor,
    generatedAt: new Date().toISOString(),
    forms,
    validationIssues,
  };
}

/**
 * Renders an AnnotatedCrfDocument to a submission-ready HTML string.
 */
export function renderToHtml(doc: AnnotatedCrfDocument): string {
  const styles = `
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; color: #333; line-height: 1.5; }
    .header { border-bottom: 2px solid #333; margin-bottom: 20px; padding-bottom: 10px; }
    .header h1 { margin: 0; font-size: 24px; }
    .header-metadata { font-size: 14px; color: #666; margin-top: 5px; }

    .form-page { page-break-after: always; border: 1px solid #ccc; padding: 40px; margin-bottom: 40px; background: white; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
    .clinical-header { background: #f0f0f0; padding: 10px; margin-bottom: 20px; border: 1px solid #ddd; font-weight: bold; font-size: 14px; }

    .item-group { margin-bottom: 30px; }
    .group-header { font-size: 18px; font-weight: bold; margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 5px; }

    .item-row { display: flex; margin-bottom: 15px; align-items: flex-start; }
    .item-content { flex: 1; padding-right: 20px; }
    .item-label { font-weight: 500; margin-bottom: 4px; }
    .item-affordance { border-bottom: 1px solid #999; height: 20px; width: 200px; margin-top: 5px; }
    .item-instructions { font-size: 12px; font-style: italic; color: #777; margin-top: 4px; }

    .annotations-container { width: 250px; }
    .annotation-box {
      border: 1px solid;
      border-radius: 3px;
      padding: 4px 8px;
      margin-bottom: 4px;
      font-size: 11px;
      font-weight: bold;
      background-color: rgba(255,255,255,0.9);
      position: relative;
    }
    .annotation-label { font-size: 9px; text-transform: uppercase; margin-bottom: 2px; }

    @media print {
      body { padding: 0; }
      .form-page { margin-bottom: 0; box-shadow: none; border: none; }
    }
  `;

  let formsHtml = "";
  for (const form of doc.forms) {
    let groupsHtml = "";
    for (const group of form.itemGroups) {
      let itemsHtml = "";
      for (const item of group.items) {
        let annotationsHtml = "";
        for (const anno of item.annotations) {
          annotationsHtml += `
            <div class="annotation-box" style="border-color: ${anno.color}; color: ${anno.color};">
              <div class="annotation-label">${anno.label}</div>
              <div class="annotation-content">${anno.content}</div>
            </div>
          `;
        }

        const label = item.label["en-US"] || Object.values(item.label)[0] || item.name;
        const instructions = item.instructions
          ? `<div class="item-instructions">${item.instructions["en-US"] || Object.values(item.instructions)[0]}</div>`
          : "";

        itemsHtml += `
          <div class="item-row">
            <div class="item-content">
              <div class="item-label">${label}</div>
              <div class="item-affordance"></div>
              ${instructions}
            </div>
            <div class="annotations-container">
              ${annotationsHtml}
            </div>
          </div>
        `;
      }

      const groupLabel = group.label
        ? group.label["en-US"] || Object.values(group.label)[0]
        : group.name;

      groupsHtml += `
        <div class="item-group">
          <div class="group-header">${groupLabel}</div>
          ${itemsHtml}
        </div>
      `;
    }

    formsHtml += `
      <div class="form-page">
        <div class="clinical-header">
          Protocol: ${doc.protocolId} | Form: ${form.formName} | Subject: ________ | Visit: ________
        </div>
        ${groupsHtml}
      </div>
    `;
  }

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>${doc.protocolId} - Annotated CRF</title>
      <style>${styles}</style>
    </head>
    <body>
      <div class="header">
        <h1>Annotated CRF (aCRF)</h1>
        <div class="header-metadata">
          Protocol ID: ${doc.protocolId} | Study: ${doc.studyName} | Version: ${doc.version}<br>
          Generated: ${formatDate(doc.generatedAt)} | Sponsor: ${doc.sponsor || "N/A"}
        </div>
      </div>
      ${formsHtml}
    </body>
    </html>
  `;
}
