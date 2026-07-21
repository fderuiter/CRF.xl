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
 * @param study
 * @param doc
 * @returns
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

  // 3. Structural Consistency (Orphans)
  doc.forms.forEach((docForm) => {
    totalChecks++;
    if (!studyFormOids.includes(docForm.formOid)) {
      issues.push({
        severity: "error",
        category: "Structure",
        message: `Form '${docForm.formOid}' exists in document but is missing from study design (Orphan).`,
        entityId: docForm.formOid,
      });
    }

    docForm.itemGroups.forEach((docGroup) => {
      docGroup.items.forEach((docItem) => {
        totalChecks++;
        const studyForm = study.forms[docForm.formOid];
        const studyItem = studyForm?.itemGroups
          .flatMap((g) => g.items)
          .find((i) => i.itemOid === docItem.itemOid);

        if (!studyItem) {
          issues.push({
            severity: "error",
            category: "Structure",
            message: `Item '${docItem.itemOid}' in form '${docForm.formOid}' exists in document but is missing from study design (Orphan).`,
            entityId: docItem.itemOid,
            location: docForm.formOid,
          });
        }
      });
    });
  });

  // 4. Annotation Coverage and Content Consistency Checks
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

        // Check for duplicate annotations of the same type
        const typeCounts: Record<string, number> = {};
        docItem.annotations.forEach((a) => {
          typeCounts[a.type] = (typeCounts[a.type] || 0) + 1;
        });

        Object.entries(typeCounts).forEach(([type, count]) => {
          totalChecks++;
          if (count > 1) {
            issues.push({
              severity: "warning",
              category: "Annotation",
              message: `Duplicate '${type}' annotations found for item '${item.itemOid}'.`,
              entityId: item.itemOid,
              location: formOid,
            });
          }
        });

        // Check SDTM mapping and content
        if (item.sdtmMapping) {
          totalChecks++;
          const domain = item.sdtmMapping.domain || "N/A";
          const variable = item.sdtmMapping.variable || "N/A";
          const expectedContent = `${domain}.${variable}`;

          const sdtmAnnos = docItem.annotations.filter((a) => a.type === "SDTM");
          const sdtmAnno = sdtmAnnos[0];

          if (!sdtmAnno) {
            issues.push({
              severity: "error",
              category: "Annotation",
              message: `SDTM mapping for '${item.itemOid}' is present in study design but missing in aCRF output.`,
              entityId: item.itemOid,
              location: formOid,
            });
          } else if (sdtmAnno.content !== expectedContent) {
            issues.push({
              severity: "error",
              category: "Consistency",
              message: `SDTM content mismatch for '${item.itemOid}': Expected '${expectedContent}', got '${sdtmAnno.content}'.`,
              entityId: item.itemOid,
              location: formOid,
            });
          }
        }

        // Check ADaM mapping and content
        if (item.adamMapping) {
          totalChecks++;
          const dataset = item.adamMapping.dataset || "N/A";
          const variable = item.adamMapping.variable || "N/A";
          const expectedContent = `${dataset}.${variable}`;

          const adamAnnos = docItem.annotations.filter((a) => a.type === "ADaM");
          const adamAnno = adamAnnos[0];

          if (!adamAnno) {
            issues.push({
              severity: "warning",
              category: "Annotation",
              message: `ADaM mapping for '${item.itemOid}' is present in study design but missing in aCRF output.`,
              entityId: item.itemOid,
              location: formOid,
            });
          } else if (adamAnno.content !== expectedContent) {
            issues.push({
              severity: "error",
              category: "Consistency",
              message: `ADaM content mismatch for '${item.itemOid}': Expected '${expectedContent}', got '${adamAnno.content}'.`,
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
