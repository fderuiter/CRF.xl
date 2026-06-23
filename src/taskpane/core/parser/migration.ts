/**
 * @issue #91
 */
import { StudyDesign } from "../types/hierarchy";
import { normalizeDataOrigin, parseReferencedVariables } from "./metadata-utils";

/**
 * Migrates a parsed study design object to ensure all new submission metadata
 * fields exist, providing smooth backward compatibility for legacy parsed data.
 */
export function migrateStudyDesign(study: any): StudyDesign {
  if (!study) {
    return study;
  }

  // Ensure submissionMetadata and its sub-arrays are fully initialized
  if (!study.submissionMetadata) {
    study.submissionMetadata = {
      sdtmDatasets: [],
      adamDatasets: [],
      sdtmDerivations: [],
      adamDerivations: [],
      sdtmVariableMetadata: [],
      adamVariableMetadata: [],
      comments: [],
      standards: [],
    };
  } else {
    study.submissionMetadata.sdtmDatasets = study.submissionMetadata.sdtmDatasets || [];
    study.submissionMetadata.adamDatasets = study.submissionMetadata.adamDatasets || [];
    study.submissionMetadata.sdtmDerivations = study.submissionMetadata.sdtmDerivations || [];
    study.submissionMetadata.adamDerivations = study.submissionMetadata.adamDerivations || [];
    study.submissionMetadata.sdtmVariableMetadata =
      study.submissionMetadata.sdtmVariableMetadata || [];
    study.submissionMetadata.adamVariableMetadata =
      study.submissionMetadata.adamVariableMetadata || [];
    study.submissionMetadata.comments = study.submissionMetadata.comments || [];
    study.submissionMetadata.standards = study.submissionMetadata.standards || [];
  }

  // Ensure sdtmMapping and adamMapping exist on all items
  if (study.forms) {
    Object.values(study.forms).forEach((form: any) => {
      if (form && form.itemGroups) {
        form.itemGroups.forEach((group: any) => {
          if (group && group.items) {
            group.items.forEach((item: any) => {
              if (item.nodeType === "display") {
                return;
              }
              if (!item.nodeType) {
                item.nodeType = "item";
              }
              if (!item.sdtmMapping) {
                item.sdtmMapping = {};
              }
              if (!item.adamMapping) {
                item.adamMapping = {};
              }
              item.origin = normalizeDataOrigin(item.origin);
            });
          }
        });
      }
    });
  }

  if (study.methods) {
    Object.values(study.methods).forEach((method: any) => {
      if (typeof method.referencedVariables === "string") {
        method.referencedVariables = parseReferencedVariables(method.referencedVariables);
      }
    });
  }

  return study as StudyDesign;
}
