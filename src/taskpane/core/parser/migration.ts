/**
 * @issue #28
 */
import { StudyDesign } from "../types/hierarchy";
import { ImportManifest, WorkbookProjection } from "../types/migration";
import { normalizeDataOrigin, parseReferencedVariables } from "./metadata-utils";
import { studyDesignSchema as StudyDesignSchema } from "../types/schemas";

interface MigrationContext {
  isDryRun?: boolean;
  manifest?: ImportManifest;
  projection?: WorkbookProjection;
}

class MigrationError extends Error {
  public manifest: ImportManifest;
  constructor(message: string, manifest: ImportManifest) {
    super(message);
    this.name = "MigrationError";
    this.manifest = manifest;
  }
}

export function migrateStudyDesign(rawStudy: unknown, context: MigrationContext = {}): StudyDesign {
  const manifest: ImportManifest = {
    id: Date.now().toString(),
    timestamp: new Date().toISOString(),
    status: "failure",
    source: "legacy-migration",
    metadata: {},
    errors: [],
    warnings: [],
    summary: { formsProcessed: 0, itemsProcessed: 0 },
  };
  context.manifest = manifest;

  if (!rawStudy || typeof rawStudy !== "object") {
    manifest.errors?.push("Invalid study input");
    throw new MigrationError("Invalid study input", manifest);
  }

  // Deep clone to ensure immutability
  const clone = JSON.parse(JSON.stringify(rawStudy)) as Record<string, unknown>;

  let formsProcessed = 0;
  let itemsProcessed = 0;

  // Ensure submissionMetadata
  if (!clone.submissionMetadata || typeof clone.submissionMetadata !== "object") {
    clone.submissionMetadata = {
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
    const sm = clone.submissionMetadata as Record<string, unknown>;
    sm.sdtmDatasets = sm.sdtmDatasets || [];
    if (Array.isArray(sm.sdtmDatasets)) {
      sm.sdtmDatasets.forEach((dataset: any) => {
        if (dataset && typeof dataset === "object") {
          if (dataset.class === "Special Purpose") dataset.class = "SpecialPurpose";
          if (dataset.class === "Findings About Events") dataset.class = "FindingsAboutEvents";
          if (dataset.class === "Trial Design") dataset.class = "TrialDesign";
        }
      });
    }
    sm.adamDatasets = sm.adamDatasets || [];
    sm.sdtmDerivations = sm.sdtmDerivations || [];
    sm.adamDerivations = sm.adamDerivations || [];
    sm.sdtmVariableMetadata = sm.sdtmVariableMetadata || [];
    sm.adamVariableMetadata = sm.adamVariableMetadata || [];
    sm.comments = sm.comments || [];
    sm.standards = sm.standards || [];
  }

  if (clone.forms && typeof clone.forms === "object") {
    Object.values(clone.forms).forEach((form: unknown) => {
      if (form && typeof form === "object") {
        formsProcessed++;
        const f = form as Record<string, unknown>;
        if (Array.isArray(f.itemGroups)) {
          f.itemGroups.forEach((group: unknown) => {
            if (group && typeof group === "object") {
              const g = group as Record<string, unknown>;
              if (Array.isArray(g.items)) {
                g.items.forEach((item: unknown) => {
                  if (item && typeof item === "object") {
                    itemsProcessed++;
                    const i = item as Record<string, unknown>;
                    if (i.nodeType === "display") {
                      return;
                    }
                    if (!i.nodeType) {
                      i.nodeType = "item";
                    }
                    if (!i.sdtmMapping || typeof i.sdtmMapping !== "object") {
                      i.sdtmMapping = {};
                    }
                    if (!i.adamMapping || typeof i.adamMapping !== "object") {
                      i.adamMapping = {};
                    }
                    if (i.origin && typeof i.origin === "string") {
                      i.origin = normalizeDataOrigin(i.origin);
                    }
                  }
                });
              }
            }
          });
        }
      }
    });
  }

  if (clone.methods && typeof clone.methods === "object") {
    Object.values(clone.methods).forEach((method: unknown) => {
      if (method && typeof method === "object") {
        const m = method as Record<string, unknown>;
        if (typeof m.referencedVariables === "string") {
          m.referencedVariables = parseReferencedVariables(m.referencedVariables);
        }
      }
    });
  }

  manifest.summary.formsProcessed = formsProcessed;
  manifest.summary.itemsProcessed = itemsProcessed;

  if (context.isDryRun) {
    context.projection = {
      changes: [],
      summary: {
        inserted: formsProcessed + itemsProcessed,
        updated: 0,
        deleted: 0,
        unchanged: 0,
      },
    };
  }

  // Zod validation step
  const parsed = StudyDesignSchema.safeParse(clone);
  if (!parsed.success) {
    console.error(JSON.stringify(parsed.error.issues, null, 2));
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join(", ");
    if (manifest.errors) manifest.errors.push(issues);
    throw new MigrationError(`Schema validation failed: ${issues}`, manifest);
  }

  manifest.status = "success";
  return parsed.data as StudyDesign;
}
