const fs = require("fs");
const { execSync } = require("child_process");
const {
  isSourceFile,
  getCommitCounts,
  getModifiedFiles,
  parseIssueTags,
  checkFileAlignment,
} = require("../volatility-matrix");

/* global jest, describe, it, expect */

jest.mock("child_process", () => ({
  execSync: jest.fn(),
}));

jest.mock("fs", () => {
  const actualFs = jest.requireActual("fs");
  return {
    ...actualFs,
    readFileSync: jest.fn(),
    existsSync: jest.fn(),
    readdirSync: jest.fn(),
  };
});

describe("Volatility Matrix & CI Gate Unit Tests", () => {
  describe("isSourceFile", () => {
    it("should accept valid TS and TSX source files in src", () => {
      expect(isSourceFile("src/taskpane/components/App.tsx")).toBe(true);
      expect(isSourceFile("src/taskpane/core/parser/validator.ts")).toBe(true);
    });

    it("should completely ignore test assets, fixtures and non-TS/TSX files", () => {
      expect(isSourceFile("src/taskpane/components/__tests__/OnboardingTour.test.tsx")).toBe(false);
      expect(isSourceFile("src/taskpane/core/parser/__tests__/validator.test.ts")).toBe(false);
      expect(isSourceFile("src/taskpane/core/generators/cdisc/__fixtures__/schema.xsd")).toBe(
        false
      );
      expect(isSourceFile("src/taskpane/core/generators/cdisc/README.md")).toBe(false);
      expect(isSourceFile("package.json")).toBe(false);
      expect(isSourceFile("webpack.config.js")).toBe(false);
    });
  });

  describe("parseIssueTags", () => {
    it("should extract unique @issue tags from file content", () => {
      (fs.readFileSync as jest.Mock).mockReturnValue(`
        /**
         * @issue #440, #439
         * @issue #440
         */
        export function foo() {}
      `);

      const issues = parseIssueTags("dummy-path.ts");
      expect(issues).toEqual(["440", "439"]);
    });

    it("should return empty array if no issue tags are present", () => {
      (fs.readFileSync as jest.Mock).mockReturnValue(`
        export function foo() {}
      `);

      const issues = parseIssueTags("dummy-path.ts");
      expect(issues).toEqual([]);
    });
  });

  describe("checkFileAlignment", () => {
    const validIssues = new Map([
      ["440", "Refactor: Extract stateless AST rule serialization utility"],
      ["28", "[Roadmap] CRF.xl Strategic Delivery Dashboard"],
    ]);

    it("should report Aligned and hasRefactoringTag for refactoring tickets", () => {
      const alignment = checkFileAlignment(["440", "28"], validIssues);
      expect(alignment.hasAnyTag).toBe(true);
      expect(alignment.hasValidTag).toBe(true);
      expect(alignment.hasRefactoringTag).toBe(true);
      expect(alignment.linkedIssues).toHaveLength(2);
    });

    it("should report Unaligned but valid for non-refactoring tags", () => {
      const alignment = checkFileAlignment(["28"], validIssues);
      expect(alignment.hasAnyTag).toBe(true);
      expect(alignment.hasValidTag).toBe(true);
      expect(alignment.hasRefactoringTag).toBe(false);
    });

    it("should report invalid and unaligned for non-existent issues", () => {
      const alignment = checkFileAlignment(["999"], validIssues);
      expect(alignment.hasAnyTag).toBe(true);
      expect(alignment.hasValidTag).toBe(false);
      expect(alignment.hasRefactoringTag).toBe(false);
    });
  });

  describe("getCommitCounts", () => {
    it("should run git log and correctly parse and accumulate commit counts", () => {
      const mockGitLog = `
src/taskpane/components/App.tsx
src/taskpane/core/parser/validator.ts
src/taskpane/components/App.tsx
src/taskpane/components/__tests__/OnboardingTour.test.tsx
      `.trim();

      (execSync as jest.Mock).mockReturnValue(mockGitLog);

      const counts = getCommitCounts();
      // App.tsx has 2 counts, validator.ts has 1 count, test.tsx is ignored
      expect(counts["src/taskpane/components/App.tsx"]).toBe(2);
      expect(counts["src/taskpane/core/parser/validator.ts"]).toBe(1);
      expect(counts["src/taskpane/components/__tests__/OnboardingTour.test.tsx"]).toBeUndefined();
    });
  });

  describe("getModifiedFiles", () => {
    it("should run git status and git diff and aggregate modified source files", () => {
      (execSync as jest.Mock)
        .mockReturnValueOnce(
          " M src/taskpane/components/App.tsx\n?? src/taskpane/components/NewFile.ts"
        ) // status
        .mockReturnValueOnce("src/taskpane/core/parser/validator.ts\n"); // diff

      const modified = getModifiedFiles();
      expect(modified).toContain("src/taskpane/components/App.tsx");
      expect(modified).toContain("src/taskpane/components/NewFile.ts");
      expect(modified).toContain("src/taskpane/core/parser/validator.ts");
    });
  });
});
