/**
 * @issue #39
 */
import { TerminologySearchService } from "../terminology-search-service";
import { TerminologySearchResult } from "../../types/terminology-search";

describe("TerminologySearchService", () => {
  const mockCandidates: TerminologySearchResult[] = [
    {
      id: "C1",
      title: "Adverse Event",
      value: "AE",
      source: "CDISC SDTM",
      matchReason: "fuzzy_match",
      score: 0,
      actions: ["apply"],
      metadata: { synonyms: ["Side Effect"] },
    },
    {
      id: "C2",
      title: "Weight",
      value: "WT",
      source: "CDISC SDTM",
      matchReason: "fuzzy_match",
      score: 0,
      actions: ["apply"],
    },
    {
      id: "C3",
      title: "Pulse Rate",
      value: "PULSE",
      source: "CDISC SDTM",
      matchReason: "fuzzy_match",
      score: 0,
      actions: ["apply"],
    },
    {
      id: "C4",
      title: "Pulse Rate",
      value: "PULSE_LOCAL",
      source: "User Context",
      matchReason: "fuzzy_match",
      score: 0,
      actions: ["apply"],
      metadata: { codelistId: "VS" },
    },
  ];

  it("returns empty array for empty search term", async () => {
    const results = await TerminologySearchService.search({ term: "" }, mockCandidates);
    expect(results).toEqual([]);
  });

  it("performs exact matching with highest priority for authoritative source", async () => {
    const results = await TerminologySearchService.search(
      { term: "Adverse Event" },
      mockCandidates
    );
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].id).toBe("C1");
    expect(results[0].matchReason).toBe("exact_match");
    expect(results[0].score).toBe(1.0);
  });

  it("performs prefix matching", async () => {
    const results = await TerminologySearchService.search({ term: "Adv" }, mockCandidates);
    expect(results.length).toBe(1);
    expect(results[0].id).toBe("C1");
    expect(results[0].matchReason).toBe("prefix_match");
  });

  it("performs synonym matching", async () => {
    const results = await TerminologySearchService.search({ term: "Side Effect" }, mockCandidates);
    expect(results.length).toBe(1);
    expect(results[0].id).toBe("C1");
    expect(results[0].matchReason).toBe("synonym_match");
  });

  it("performs code-based matching", async () => {
    const results = await TerminologySearchService.search({ term: "AE" }, mockCandidates);
    expect(results.length).toBe(1);
    expect(results[0].id).toBe("C1");
    expect(results[0].matchReason).toBe("code_match");
  });

  it("ranks user context matches below authoritative matches for the same term", async () => {
    const results = await TerminologySearchService.search({ term: "Pulse Rate" }, mockCandidates);
    expect(results.length).toBe(2);
    expect(results[0].id).toBe("C3"); // CDISC SDTM
    expect(results[1].id).toBe("C4"); // User Context
    expect(results[0].score).toBe(1.0);
    expect(results[1].score).toBe(0.75); // User context exact match but not authoritative or context-relevant
  });

  it("boosts context-relevant matches when codelistId is provided", async () => {
    const results = await TerminologySearchService.search(
      { term: "Pulse Rate", context: { codelistId: "VS" } },
      mockCandidates
    );
    expect(results.length).toBe(2);
    // Authoritative (CDISC) still ranks highest (1.0)
    // User Context exact match with metadata.codelistId === "VS" is boosted to 0.8
    expect(results[0].id).toBe("C3");
    expect(results[0].score).toBe(1.0);
    expect(results[1].id).toBe("C4");
    expect(results[1].score).toBe(0.8);
  });

  it("limits results based on query", async () => {
    const results = await TerminologySearchService.search({ term: "e", limit: 1 }, mockCandidates);
    expect(results.length).toBe(1);
  });

  it("filters by mode", async () => {
    const results = await TerminologySearchService.search(
      { term: "Adv", modes: ["exact"] },
      mockCandidates
    );
    expect(results.length).toBe(0);
  });
});
