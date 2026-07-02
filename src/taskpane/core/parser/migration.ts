/**
 * @issue #28
 */
import { StudyDesign } from "../types/hierarchy";
import { studyDesignSchema } from "../types/schemas";
import { normalizeDataOrigin, parseReferencedVariables } from "./metadata-utils";
import { ZodError } from "zod";

type LegacyItem = Record<string, unknown> & {
  nodeType?: string;
  sdtmMapping?: Record<string, unknown>;
  adamMapping?: Record<string, unknown>;
  origin?: string;
};

type LegacyGroup = Record<string, unknown> & {
  items?: LegacyItem[];
};

type LegacyForm = Record<string, unknown> & {
  itemGroups?: LegacyGroup[];
};

interface LegacyStudy extends Record<string, unknown> {
  submissionMetadata?: {
    sdtmDatasets?: unknown[];
    adamDatasets?: unknown[];
    sdtmDerivations?: unknown[];
    adamDerivations?: unknown[];
    sdtmVariableMetadata?: unknown[];
    adamVariableMetadata?: unknown[];
    comments?: unknown[];
    standards?: unknown[];
  };
  forms?: Record<string, LegacyForm>;
  methods?: Record<string, { referencedVariables?: unknown }>;
}

/**
 * Migrates a parsed study design object to ensure all new submission metadata
 * fields exist, providing smooth backward compatibility for legacy parsed data.
 */
export function migrateStudyDesign(study: unknown): StudyDesign {
  if (!study) {
    return study as StudyDesign;
  }

  const s = study as LegacyStudy;

  // Ensure submissionMetadata and its sub-arrays are fully initialized
  if (!s.submissionMetadata) {
    s.submissionMetadata = {
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
    s.submissionMetadata.sdtmDatasets = s.submissionMetadata.sdtmDatasets || [];
    s.submissionMetadata.adamDatasets = s.submissionMetadata.adamDatasets || [];
    s.submissionMetadata.sdtmDerivations = s.submissionMetadata.sdtmDerivations || [];
    s.submissionMetadata.adamDerivations = s.submissionMetadata.adamDerivations || [];
    s.submissionMetadata.sdtmVariableMetadata =
      s.submissionMetadata.sdtmVariableMetadata || [];
    s.submissionMetadata.adamVariableMetadata =
      s.submissionMetadata.adamVariableMetadata || [];
    s.submissionMetadata.comments = s.submissionMetadata.comments || [];
    s.submissionMetadata.standards = s.submissionMetadata.standards || [];
  }

  // Ensure sdtmMapping and adamMapping exist on all items
  if (s.forms) {
    Object.values(s.forms).forEach((form: LegacyForm) => {
      if (form && form.itemGroups) {
        form.itemGroups.forEach((group: LegacyGroup) => {
          if (group && group.items) {
            group.items.forEach((item: LegacyItem) => {
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

  if (s.methods) {
    Object.values(s.methods).forEach((method) => {
      if (typeof method.referencedVariables === "string") {
        method.referencedVariables = parseReferencedVariables(method.referencedVariables);
      }
    });
  }

  try {
    return studyDesignSchema.parse(s) as StudyDesign;
  } catch (error) {
    if (error instanceof ZodError) {
      const issues = error.issues.map((e: unknown) => {
        const issue = e as { path: string[], message: string };
        return `${issue.path.join('.')}: ${issue.message}`;
      }).join(', ');
      throw new Error(`Schema validation failed: ${issues}`);
    }
    throw error;
  }
}
