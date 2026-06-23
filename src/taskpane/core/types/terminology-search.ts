/**
 * @issue #39
 */
/**
 * ============================================================================
 * terminology-search.ts
 * ============================================================================
 * Types for terminology search queries and result models.
 */

export type TerminologySearchMode = "exact" | "prefix" | "fuzzy" | "synonym" | "code";

export type MatchReason =
  | "exact_match"
  | "prefix_match"
  | "fuzzy_match"
  | "synonym_match"
  | "code_match";

/**
 * Priority order for ranking:
 * 1. Exact authoritative source match (score: 1.0)
 * 2. Exact user-context-relevant match (score: 0.8)
 * 3. Fuzzy/synonym match (score: 0.1 - 0.7)
 */
export interface TerminologySearchResult {
  /** Stable result/entity ID (e.g., NCI Code or OID) */
  id: string;
  /** Primary label for display */
  title: string;
  /** Canonical submission value or code */
  value: string;
  /** Source of the terminology (e.g., "CDISC SDTM", "User Context") */
  source: string;
  /** Why this result was returned */
  matchReason: MatchReason;
  /** Confidence score between 0 and 1 */
  score: number;
  /** Set of supported UI actions for this result */
  actions: ("apply" | "preview" | "details")[];
  /** Optional extended properties (e.g., definition, synonyms) */
  metadata?: Record<string, any>;
}

export interface TerminologySearchQuery {
  /** The search string entered by the user */
  term: string;
  /** Restrict search to specific modes if provided */
  modes?: TerminologySearchMode[];
  /** Contextual hints to influence ranking (e.g., currently active codelist) */
  context?: {
    codelistId?: string;
    preferredSource?: string;
  };
  /** Maximum number of results to return */
  limit?: number;
}
