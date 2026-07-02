/**
 * @issue #84
 */
/* global Excel */
import { Annotation } from "../types";

export enum RepairConfidence {
  High = "High", // Auto-heal
  Medium = "Medium", // Warn + User Action
  Low = "Low", // Block / Ambiguous
}

export type AnnotationValidationCategory =
  | "MissingAnchor"
  | "InvalidTarget"
  | "Conflict"
  | "BrokenReference"
  | "MutationDrift"
  | "Orphaned"
  | "ProtectedRange"
  | "MergedCell";

export interface AnnotationValidationIssue {
  category: AnnotationValidationCategory;
  message: string;
  confidence: RepairConfidence;
  annotationId?: string;
  location?: string;
}

export interface RepairPolicy {
  action: "AutoHeal" | "Warn" | "Block";
  description: string;
}

/**
 * Validates if an annotation can be applied to the target range.
 * Checks for merged cells and protection.
 */
export async function validateAnnotationTarget(
  range: Excel.Range
): Promise<AnnotationValidationIssue[]> {
  const issues: AnnotationValidationIssue[] = [];

  if (typeof range.load === "function") {
    range.load(["format/protection/locked", "address", "worksheet/protection/protected"]);
  }

  // We'll also try to load if it's merged. In some Office.js versions, this is via getMergedAreas
  let mergedAreas: any = null;
  if (typeof range.getMergedAreasOrNullObject === "function") {
    mergedAreas = range.getMergedAreasOrNullObject();
    mergedAreas.load("address");
  }

  if (typeof range.context?.sync === "function") {
    await range.context.sync();
  }

  if (range.worksheet?.protection?.protected && range.format?.protection?.locked) {
    issues.push({
      category: "ProtectedRange",
      message: `The range ${range.address} is protected and cannot be annotated.`,
      confidence: RepairConfidence.Low,
      location: range.address,
    });
  }

  if (mergedAreas && !mergedAreas.isNullObject && mergedAreas.address !== range.address) {
    issues.push({
      category: "MergedCell",
      message: `The range ${range.address} is part of a merged cell. Annotations on merged cells may behave unexpectedly.`,
      confidence: RepairConfidence.Medium,
      location: range.address,
    });
  }

  return issues;
}

/**
 * Detects conflicts between a new candidate annotation and existing ones.
 */
export function detectConflicts(
  existing: Annotation[],
  candidate: Annotation
): AnnotationValidationIssue[] {
  const issues: AnnotationValidationIssue[] = [];

  for (const anno of existing) {
    if (
      anno.anchor.address === candidate.anchor.address &&
      anno.anchor.sheetName === candidate.anchor.sheetName
    ) {
      if (anno.type !== candidate.type) {
        issues.push({
          category: "Conflict",
          message: `Conflicting annotation type: ${anno.type} already exists at ${candidate.anchor.address}.`,
          confidence: RepairConfidence.Low,
          annotationId: anno.id,
          location: candidate.anchor.address,
        });
      } else if (anno.id !== candidate.id) {
        // Same type, different ID - likely a duplicate if not explicitly updating
        issues.push({
          category: "Conflict",
          message: `Duplicate ${anno.type} annotation at ${candidate.anchor.address}.`,
          confidence: RepairConfidence.Medium,
          annotationId: anno.id,
          location: candidate.anchor.address,
        });
      }
    }
  }

  return issues;
}

/**
 * Determines the repair policy based on the validation issue.
 */
export function getRepairPolicy(issue: AnnotationValidationIssue): RepairPolicy {
  switch (issue.confidence) {
    case RepairConfidence.High:
      return { action: "AutoHeal", description: "System will automatically repair this issue." };
    case RepairConfidence.Medium:
      return { action: "Warn", description: "Issue detected. User intervention recommended." };
    case RepairConfidence.Low:
    default:
      return {
        action: "Block",
        description: "Operation blocked due to ambiguity or permission issues.",
      };
  }
}
