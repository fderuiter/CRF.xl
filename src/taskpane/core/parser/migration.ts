import { StudyDesign } from "../types/hierarchy";

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
    };
  } else {
    study.submissionMetadata.sdtmDatasets = study.submissionMetadata.sdtmDatasets || [];
    study.submissionMetadata.adamDatasets = study.submissionMetadata.adamDatasets || [];
    study.submissionMetadata.sdtmDerivations = study.submissionMetadata.sdtmDerivations || [];
    study.submissionMetadata.adamDerivations = study.submissionMetadata.adamDerivations || [];
  }

  // Ensure sdtmMapping and adamMapping exist on all items
  if (study.forms) {
    Object.values(study.forms).forEach((form: any) => {
      if (form && form.itemGroups) {
        form.itemGroups.forEach((group: any) => {
          if (group && group.items) {
            group.items.forEach((item: any) => {
              if (!item.sdtmMapping) {
                item.sdtmMapping = {};
              }
              if (!item.adamMapping) {
                item.adamMapping = {};
              }
            });
          }
        });
      }
    });
  }

  return study as StudyDesign;
}
