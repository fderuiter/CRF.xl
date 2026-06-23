/**
 * @issue #28
 */
/**
 * ============================================================================
 * common.ts
 * ============================================================================
 * Shared utility types to prevent circular dependencies across modules.
 */

/**
 * Indicates the translation state of a content item.
 * Missing translations are a first-class state per requirement.
 */
export enum TranslationStatus {
  Original = "Original",
  Translated = "Translated",
  NeedsReview = "NeedsReview",
  Outdated = "Outdated",
  Missing = "Missing",
}

/**
 * A discrete unit of localized content with metadata.
 */
export interface TranslationUnit {
  /** The localized string value. */
  value: string;
  /** The current status of this translation. */
  status: TranslationStatus;
  /** ISO 8601 timestamp of the last modification. */
  lastUpdated: string;
}

/**
 * A collection of localized strings or translation units keyed by locale code (e.g., 'en-US').
 * Supports backward-compatible string-only mapping and the enhanced TranslationUnit model.
 */
export type TranslatedText = Record<string, string | TranslationUnit>;

export interface SystemAlias {
  context: string; // e.g., 'IRT', 'ePRO', 'CentralLab'
  variableName: string; // How the external system refers to this field
}

export interface RolePermissions {
  read?: string[]; // Roles that can view the data (e.g., ['CRA', 'PI', 'Sponsor'])
  write?: string[]; // Roles that can edit the data (e.g., ['PI', 'SiteCoordinator'])
  blindedRoles?: string[]; // Explicitly identifies roles legally blinded from this data point
}
