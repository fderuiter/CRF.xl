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
  Annotation,
  ReviewerComment,
} from "../types";
import { formatDate } from "../utils/locale-utils";
import { getTranslation } from "../generators/shared-localization";

/**
 * Builds an AnnotatedCrfDocument from a StudyDesign and optional annotations.
 */
export function buildAnnotatedCrfDocument(
  study: StudyDesign,
  validationIssues: any[] = [],
  storedAnnotations: Annotation[] = [],
  reviewerComments: ReviewerComment[] = []
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
            const sasName = item.sdtmMapping.sasFieldName || item.itemOid;
            const variable = item.sdtmMapping.variable || sasName || "N/A";
            const nciCode = item.sdtmMapping.nciVariableCode || item.codelistId || "N/A";

            annotations.push({
              type: AcrfAnnotationType.SDTM,
              label: "SDTM",
              content: `[${item.itemOid}]<br/>Domain: ${domain} | Var: ${variable} | NCI: ${nciCode}`,
              commentOid: item.sdtmMapping.commentOid,
              color: "var(--colorPaletteRedBackground3)", // Red for SDTM
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
              color: "var(--colorPalettePurpleBackground3)", // Purple for ADaM
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
                color: "var(--colorPaletteOrangeBackground3)", // Orange for Rule
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
              color:
                issue.level === "Error"
                  ? "var(--colorStatusDangerBackground3)"
                  : "var(--colorStatusWarningBackground3)",
            });
          });

          // 5. Stored Annotations (from AnnotationService)
          const itemStoredAnnotations = storedAnnotations.filter(
            (a) => a.anchor.logicalId === item.itemOid || a.anchor.address.includes(item.itemOid)
          );
          itemStoredAnnotations.forEach((anno) => {
            const content = typeof anno.content === "string" ? anno.content : anno.content.value;
            annotations.push({
              type: anno.type as unknown as AcrfAnnotationType,
              label: anno.type,
              content: content || "",
              color: "var(--colorNeutralBackgroundInverted)", // Default color for custom annotations
            });
          });

          // 6. Reviewer Comments
          const itemReviewComments = reviewerComments.filter(
            (c) => c.targetEntityId === item.itemOid
          );
          itemReviewComments.forEach((comment) => {
            annotations.push({
              type: AcrfAnnotationType.COMMENT,
              label: "Review",
              content: `${comment.author}: ${comment.text} (${comment.status})`,
              color:
                comment.status === "resolved"
                  ? "var(--colorStatusSuccessBackground3)"
                  : "var(--colorBrandBackground)",
            });
          });

          items.push({
            itemOid: item.itemOid,
            name: item.name,
            label: item.label,
            dataType: item.dataType as any,
            mandatory: !!item.validation?.required,
            codelistId: item.codelistId,
            instructions: item.instructions,
            annotations,
          });
        }
      }

      itemGroups.push({
        groupOid: group.groupOid!,
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
    reviewerComments,
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

    .annotations-container { width: 250px; text-align: right; float: right; margin-left: 20px; }
    .annotation-box {
      border: 1px solid;
      border-radius: 3px;
      padding: 4px 8px;
      margin-bottom: 4px;
      font-family: Arial, sans-serif;
      font-size: 8pt;
      font-weight: bold;
      color: white;
      text-align: left;
      display: inline-block;
      min-width: 150px;
    }
    .annotation-label { font-size: 8pt; text-transform: uppercase; margin-bottom: 2px; }

    .comb-container {
      border-collapse: collapse;
      margin-top: 5px;
    }
    .comb-cell {
      border: 1px solid #333;
      width: 15px;
      height: 20px;
    }

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
          let bgColor = anno.color || "var(--colorBrandBackground)";

          annotationsHtml += `
            <div class="annotation-box" style="background-color: ${bgColor}; border-color: ${bgColor};">
              <div class="annotation-label">${anno.label}</div>
              <div class="annotation-content">${anno.content}</div>
            </div><br/>
          `;
        }

        const label = getTranslation(item.label, "en-US") || item.name;
        const instructions = item.instructions
          ? `<div class="item-instructions">${getTranslation(item.instructions, "en-US")}</div>`
          : "";

        let affordanceHtml = `<div class="item-affordance"></div>`;
        if (item.dataType === "Integer" || item.dataType === "Float") {
          affordanceHtml = `
            <table class="comb-container">
              <tr>
                <td class="comb-cell"></td>
                <td class="comb-cell"></td>
                <td class="comb-cell"></td>
                <td class="comb-cell"></td>
                <td class="comb-cell"></td>
              </tr>
            </table>
          `;
        }

        itemsHtml += `
          <div class="item-row">
            <div class="item-content">
              <div class="item-label">${label}</div>
              ${affordanceHtml}
              ${instructions}
            </div>
            <div class="annotations-container">
              ${annotationsHtml}
            </div>
            <div style="clear:both;"></div>
          </div>
        `;
      }

      const groupLabel = group.label
        ? getTranslation(group.label, "en-US")
        : group.name;

      groupsHtml += `
        <div class="item-group">
          <div class="group-header">${groupLabel}</div>
          ${itemsHtml}
        </div>
      `;
    }

    formsHtml += `
      <div class="form-page" id="form-${form.formOid}">
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
