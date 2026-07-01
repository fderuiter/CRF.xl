/**
 * @issue #184
 */
import {
  StudyDesign,
  AnnotatedCrfDocument,
  AcrfVerificationResult,
  AcrfVerificationIssue,
  isCrfItem,
} from "../types";

/**
 * Verifies that the generated Annotated CRF document faithfully reflects the source study design.
 */
export function verifyAnnotatedCrf(
  study: StudyDesign,
  doc: AnnotatedCrfDocument
): AcrfVerificationResult {
  const issues: AcrfVerificationIssue[] = [];
  let totalChecks = 0;

  // 1. Metadata Checks
  totalChecks++;
  if (!doc.protocolId || doc.protocolId === "UNKNOWN") {
    issues.push({
      severity: "error",
      category: "Metadata",
      message: "Protocol ID is missing or UNKNOWN.",
    });
  }

  totalChecks++;
  if (!doc.studyName) {
    issues.push({
      severity: "warning",
      category: "Metadata",
      message: "Study Name is missing in the generated document.",
    });
  }

  // 2. Structural Checks (Forms)
  const studyFormOids = Object.keys(study.forms);
  const docFormOids = doc.forms.map((f) => f.formOid);

  studyFormOids.forEach((oid) => {
    totalChecks++;
    if (!docFormOids.includes(oid)) {
      issues.push({
        severity: "error",
        category: "Structure",
        message: `Form '${oid}' is missing from the generated document.`,
        entityId: oid,
      });
    }
  });

  // 3. Annotation Coverage Checks
  for (const [formOid, studyForm] of Object.entries(study.forms)) {
    const docForm = doc.forms.find((f) => f.formOid === formOid);
    if (!docForm) continue;

    for (const group of studyForm.itemGroups) {
      for (const item of group.items) {
        if (!isCrfItem(item)) continue;

        totalChecks++;
        const docItem = docForm.itemGroups
          .flatMap((g) => g.items)
          .find((i) => i.itemOid === item.itemOid);

        if (!docItem) {
          issues.push({
            severity: "error",
            category: "Structure",
            message: `Item '${item.itemOid}' in form '${formOid}' is missing from the document.`,
            entityId: item.itemOid,
            location: formOid,
          });
          continue;
        }

        // Check if SDTM mapping exists in source but not in doc
        if (item.sdtmMapping) {
          const hasSdtmAnno = docItem.annotations.some((a) => a.type === "SDTM");
          if (!hasSdtmAnno) {
            issues.push({
              severity: "error",
              category: "Annotation",
              message: `SDTM mapping for '${item.itemOid}' is present in study design but missing in aCRF output.`,
              entityId: item.itemOid,
              location: formOid,
            });
          }
        }

        // Check if ADaM mapping exists in source but not in doc
        if (item.adamMapping) {
          const hasAdamAnno = docItem.annotations.some((a) => a.type === "ADaM");
          if (!hasAdamAnno) {
            issues.push({
              severity: "warning",
              category: "Annotation",
              message: `ADaM mapping for '${item.itemOid}' is present in study design but missing in aCRF output.`,
              entityId: item.itemOid,
              location: formOid,
            });
          }
        }
      }
    }
  }

  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;

  return {
    isValid: errorCount === 0,
    issues,
    summary: {
      errorCount,
      warningCount,
      totalChecks,
    },
  };
}
