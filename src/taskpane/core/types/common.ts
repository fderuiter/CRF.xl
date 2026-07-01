/**
 * @issue #28
 */
/**
 * ============================================================================
 * common.ts
 * ============================================================================
 * Shared utility types to prevent circular dependencies across modules.
 */

export type TranslatedText = Record<string, string>; // e.g., { "en": "Weight", "es": "Peso" }

export interface AuditJustification {
  reason: string;
  userId: string;
  timestamp: string;
}

export interface RolePermissions {
  read?: string[]; // Roles that can view the data (e.g., ['CRA', 'PI', 'Sponsor'])
  write?: string[]; // Roles that can edit the data (e.g., ['PI', 'SiteCoordinator'])
  blindedRoles?: string[]; // Explicitly identifies roles legally blinded from this data point
}
