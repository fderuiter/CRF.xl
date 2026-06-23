/**
 * @issue #39
 */
import { TerminologySearchQuery, TerminologySearchResult, MatchReason } from "../types/terminology-search";

export class TerminologySearchService {
  /**
   * Performs a search across terminology sources and ranks results.
   * NOTE: This implementation currently ranks provided results. In a full system,
   * it would call the CDISC Library API or query local context.
   */
  public static async search(
    query: TerminologySearchQuery,
    candidates: TerminologySearchResult[]
  ): Promise<TerminologySearchResult[]> {
    const { term, modes, context, limit = 10 } = query;
    if (!term || term.trim().length === 0) {
      return [];
    }

    const normalizedTerm = term.toLowerCase().trim();
    const activeModes = modes || ["exact", "prefix", "fuzzy", "synonym", "code"];

    const results: TerminologySearchResult[] = [];

    for (const candidate of candidates) {
      let matched = false;
      let reason: MatchReason = "fuzzy_match";
      let baseScore = 0;

      const titleLower = candidate.title.toLowerCase();
      const valueLower = candidate.value.toLowerCase();
      const idLower = candidate.id.toLowerCase();
      const synonyms = (candidate.metadata?.synonyms as string[])?.map((s) => s.toLowerCase()) || [];

      // 1. Exact Match
      if (activeModes.includes("exact") && titleLower === normalizedTerm) {
        matched = true;
        reason = "exact_match";
        baseScore = 0.75; // Base for exact matches, will be boosted by rules
      }
      // 2. Code/ID Match
      else if (
        (activeModes.includes("code") && valueLower === normalizedTerm) ||
        idLower === normalizedTerm
      ) {
        matched = true;
        reason = "code_match";
        baseScore = 0.7;
      }
      // 3. Prefix Match
      else if (activeModes.includes("prefix") && titleLower.startsWith(normalizedTerm)) {
        matched = true;
        reason = "prefix_match";
        baseScore = 0.7;
      }
      // 4. Synonym Match
      else if (activeModes.includes("synonym") && synonyms.includes(normalizedTerm)) {
        matched = true;
        reason = "synonym_match";
        baseScore = 0.6;
      }
      // 5. Fuzzy Match (simple substring for this model)
      else if (activeModes.includes("fuzzy") && titleLower.includes(normalizedTerm)) {
        matched = true;
        reason = "fuzzy_match";
        baseScore = 0.4;
      }

      if (matched) {
        const result: TerminologySearchResult = {
          ...candidate,
          matchReason: reason,
          score: baseScore, // Temporarily set to baseScore
        };
        result.score = this.calculateFinalScore(result, context);
        results.push(result);
      }
    }

    return results
      .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
      .slice(0, limit);
  }

  /**
   * Adjusts the base score based on priority rules:
   * 1. Exact authoritative source match (score: 1.0)
   * 2. Exact user-context-relevant match (score: 0.8)
   * 3. Generic Exact Match (score: 0.75)
   * 4. Fuzzy/synonym match (score: 0.1 - 0.7)
   */
  private static calculateFinalScore(
    result: TerminologySearchResult,
    context?: TerminologySearchQuery["context"]
  ): number {
    let score = result.score;

    if (result.matchReason === "exact_match") {
      // Rule 1: Boost authoritative source for exact matches
      if (result.source.startsWith("CDISC") || result.source === context?.preferredSource) {
        score = 1.0;
      }
      // Rule 2: Boost user-context-relevant match
      else if (
        context?.codelistId &&
        result.metadata?.codelistId === context.codelistId
      ) {
        score = 0.8;
      }
      // Rule 3: Generic exact match remains at baseScore (0.75)
    } else if (context?.preferredSource && result.source === context.preferredSource) {
      // Context boost for other matches
      score += 0.05;
    }

    return Math.min(1.0, score);
  }
}
