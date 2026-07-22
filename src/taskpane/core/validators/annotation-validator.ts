/// <reference types="office-js" />
/**
 * @issue #84
 */
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

interface RepairPolicy {
  action: "AutoHeal" | "Warn" | "Block";
  description: string;
}

export interface ExcelRangeData {
  address: string;
  isLocked: boolean;
  isWorksheetProtected: boolean;
  isMerged: boolean;
  mergedAddress?: string;
}

/**
 * Validates if an annotation can be applied to the target range.
 * Checks for merged cells and protection.
 * @param rangeData
 * @returns
 */
export function validateAnnotationTarget(rangeData: ExcelRangeData): AnnotationValidationIssue[] {
  const issues: AnnotationValidationIssue[] = [];

  if (rangeData.isWorksheetProtected && rangeData.isLocked) {
    issues.push({
      category: "ProtectedRange",
      message: `The range ${rangeData.address} is protected and cannot be annotated.`,
      confidence: RepairConfidence.Low,
      location: rangeData.address,
    });
  }

  if (rangeData.isMerged && rangeData.mergedAddress !== rangeData.address) {
    issues.push({
      category: "MergedCell",
      message: `The range ${rangeData.address} is part of a merged cell. Annotations on merged cells may behave unexpectedly.`,
      confidence: RepairConfidence.Medium,
      location: rangeData.address,
    });
  }

  return issues;
}

/**
 * Detects conflicts between a new candidate annotation and existing ones.
 * @param existing
 * @param candidate
 * @returns
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
 * @param issue
 * @returns
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
