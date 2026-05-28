import { StudyDesign } from "../types/hierarchy";
import { normalizeDataOrigin, parseReferencedVariables } from "./metadata-utils";

export const CURRENT_SCHEMA_VERSION = "1.0.0";

/**
 * Migrates a parsed study design object to ensure all new submission metadata
 * fields exist, providing smooth backward compatibility for legacy parsed data.
 */
export function migrateStudyDesign(study: any): StudyDesign {
  if (!study) {
    return study;
  }

  if (study.schemaVersion && study.schemaVersion !== CURRENT_SCHEMA_VERSION) {
    throw new Error(`Unsupported schema version: ${study.schemaVersion}`);
  }

  if (!study.schemaVersion) {
    const flattenedGroups: Record<string, any> = {};
    const flattenedItems: Record<string, any> = {};
    const flattenedEvents: Record<string, any> = {};

    if (Array.isArray(study.events)) {
      study.events.forEach((evt: any) => {
        flattenedEvents[evt.eventOid] = evt;
      });
      study.events = flattenedEvents;
    }

    if (study.forms) {
      Object.values(study.forms).forEach((form: any) => {
        if (form.itemGroups) {
          form.itemGroups.forEach((group: any) => {
            group.formOid = form.formOid;
            flattenedGroups[group.groupOid] = { ...group };
            delete flattenedGroups[group.groupOid].items;

            if (group.items) {
              let displayCount = 0;
              group.items.forEach((item: any) => {
                if (item.nodeType !== "display" && !item.nodeType) {
                  item.nodeType = "item";
                }
                if (item.nodeType !== "display") {
                  if (!item.sdtmMapping) item.sdtmMapping = {};
                  if (!item.adamMapping) item.adamMapping = {};
                  item.origin = normalizeDataOrigin(item.origin);
                }
                item.formOid = form.formOid;
                item.groupOid = group.groupOid;

                const itemKey = item.itemOid || `display_${Date.now()}_${displayCount++}`;
                flattenedItems[itemKey] = item;
              });
            }
          });
          delete form.itemGroups;
        }
      });
    }

    study.groups = study.groups || flattenedGroups;
    study.items = study.items || flattenedItems;
    study.schemaVersion = CURRENT_SCHEMA_VERSION;
  } else {
    // If it's already the current schema version, just ensure properties are initialized
    if (study.items) {
      Object.values(study.items).forEach((item: any) => {
        if (item.nodeType !== "display") {
          if (!item.sdtmMapping) item.sdtmMapping = {};
          if (!item.adamMapping) item.adamMapping = {};
          item.origin = normalizeDataOrigin(item.origin);
        }
      });
    }
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

  if (study.methods) {
    Object.values(study.methods).forEach((method: any) => {
      if (typeof method.referencedVariables === "string") {
        method.referencedVariables = parseReferencedVariables(method.referencedVariables);
      }
    });
  }

  return study as StudyDesign;
}
