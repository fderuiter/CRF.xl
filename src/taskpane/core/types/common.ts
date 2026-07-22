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
