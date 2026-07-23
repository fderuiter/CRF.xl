const { parseIgnorePattern, isIgnored, loadDocsignore } = require("../docs-scanner");

describe("docs-scanner .docsignore parser and scanner", () => {
  describe("parseIgnorePattern", () => {
    it("should ignore comment lines and blank lines", () => {
      expect(parseIgnorePattern("# comment")).toBeNull();
      expect(parseIgnorePattern("  ")).toBeNull();
      expect(parseIgnorePattern("")).toBeNull();
    });

    it("should handle standard non-slash patterns anywhere in path", () => {
      const parsed = parseIgnorePattern("drafts");
      expect(parsed).not.toBeNull();
      expect(parsed.isDirectoryOnly).toBe(false);

      // matches files/dirs named 'drafts'
      expect(isIgnored("drafts", true, [parsed])).toBe(true);
      expect(isIgnored("docs/drafts", true, [parsed])).toBe(true);
      expect(isIgnored("docs/drafts/file.md", false, [parsed])).toBe(true);

      // should NOT match if drafts is part of another word
      expect(isIgnored("drafts_notes", false, [parsed])).toBe(false);
      expect(isIgnored("mydrafts", false, [parsed])).toBe(false);
    });

    it("should handle directory only patterns ending with slash", () => {
      const parsed = parseIgnorePattern("drafts/");
      expect(parsed).not.toBeNull();
      expect(parsed.isDirectoryOnly).toBe(true);

      // should ignore directory
      expect(isIgnored("drafts", true, [parsed])).toBe(true);
      expect(isIgnored("docs/drafts", true, [parsed])).toBe(true);
      // should ignore files inside directory
      expect(isIgnored("docs/drafts/file.md", false, [parsed])).toBe(true);

      // should NOT ignore exact file with same name
      expect(isIgnored("drafts", false, [parsed])).toBe(false);
      expect(isIgnored("docs/drafts", false, [parsed])).toBe(false);
    });

    it("should handle wildcard patterns", () => {
      const parsed = parseIgnorePattern("*.draft.md");
      expect(parsed).not.toBeNull();

      expect(isIgnored("file.draft.md", false, [parsed])).toBe(true);
      expect(isIgnored("docs/architecture/roadmap.draft.md", false, [parsed])).toBe(true);
      expect(isIgnored("roadmap.md", false, [parsed])).toBe(false);
    });

    it("should handle glob with double asterisks", () => {
      const parsed = parseIgnorePattern("temp/**/*.md");
      expect(parsed).not.toBeNull();

      expect(isIgnored("temp/b.md", false, [parsed])).toBe(true);
      expect(isIgnored("temp/a/b.md", false, [parsed])).toBe(true);
      expect(isIgnored("other/b.md", false, [parsed])).toBe(false);
    });
  });

  describe("loadDocsignore default rules", () => {
    it("should always include node_modules/ by default", () => {
      const parsedPatterns = loadDocsignore("/non-existent-path");
      expect(parsedPatterns.length).toBeGreaterThanOrEqual(1);

      const nodeModulesIgnored = isIgnored("node_modules", true, parsedPatterns);
      expect(nodeModulesIgnored).toBe(true);

      const nodeModulesFileIgnored = isIgnored(
        "node_modules/some-lib/index.js",
        false,
        parsedPatterns
      );
      expect(nodeModulesFileIgnored).toBe(true);
    });
  });
});
