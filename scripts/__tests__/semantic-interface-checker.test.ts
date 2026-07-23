const checker = require("../semantic-interface-checker");

describe("Semantic Interface Checker - Folder-to-Doc Mapping", () => {
  describe("getDirChain", () => {
    it("should correctly build a directory chain starting from a subdirectory", () => {
      const chain = checker.getDirChain("src/taskpane/components/button");
      expect(chain).toEqual([
        "src/taskpane/components/button",
        "src/taskpane/components",
        "src/taskpane",
        "src",
      ]);
    });

    it("should handle a single level directory", () => {
      const chain = checker.getDirChain("src");
      expect(chain).toEqual(["src"]);
    });

    it("should return an empty array for root or empty", () => {
      expect(checker.getDirChain(".")).toEqual([]);
      expect(checker.getDirChain("")).toEqual([]);
    });
  });

  describe("runValidation", () => {
    // Helper function to simulate files being read
    const defaultReadFile = (filePath: string) => {
      if (filePath === "src/taskpane/components/button/index.ts") {
        return "export function MyButton() { return null; }"; // modified
      }
      return "";
    };

    const defaultGetFileContent = (_ref: string, filePath: string) => {
      if (filePath === "src/taskpane/components/button/index.ts") {
        return "export function MyButton(props: any) { return null; }"; // base (different signature)
      }
      return "";
    };

    it("should pass when no files are modified", () => {
      const result = checker.runValidation({
        modifiedFiles: [],
        config: { mappings: {}, exclusions: [] },
        getFileContent: defaultGetFileContent,
        readFile: defaultReadFile,
      });

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    describe("Exclusions", () => {
      it("should skip validation entirely if a folder matches an exclusion entry", () => {
        // public API has changed for "src/taskpane/utils/helper.ts"
        const modifiedFiles = [
          {
            status: "M",
            oldFile: "src/taskpane/utils/helper.ts",
            file: "src/taskpane/utils/helper.ts",
          },
        ];

        const config = {
          mappings: {},
          exclusions: ["src/taskpane/utils"],
        };

        const customGetFileContent = (_ref: string, _path: string) => "export const foo = 1;";
        const customReadFile = (_path: string) => "export const foo = 2; export const bar = 3;";

        const result = checker.runValidation({
          modifiedFiles,
          config,
          getFileContent: customGetFileContent,
          readFile: customReadFile,
        });

        // Exclusion matches, so it is skipped from validation entirely
        expect(result.success).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it("should skip validation entirely if a parent folder matches an exclusion entry", () => {
        // public API has changed in a nested subfolder
        const modifiedFiles = [
          {
            status: "M",
            oldFile: "src/taskpane/utils/deep/nested/helper.ts",
            file: "src/taskpane/utils/deep/nested/helper.ts",
          },
        ];

        const config = {
          mappings: {},
          exclusions: ["src/taskpane/utils"],
        };

        const customGetFileContent = (_ref: string, _path: string) => "export const foo = 1;";
        const customReadFile = (_path: string) => "export const foo = 2; export const bar = 3;";

        const result = checker.runValidation({
          modifiedFiles,
          config,
          getFileContent: customGetFileContent,
          readFile: customReadFile,
        });

        // Parent exclusion matches, so it is skipped from validation entirely
        expect(result.success).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe("Mappings", () => {
      it("should pass when mapped central markdown file and module map are modified in the same change set", () => {
        const modifiedFiles = [
          {
            status: "M",
            oldFile: "src/taskpane/components/button/index.ts",
            file: "src/taskpane/components/button/index.ts",
          },
          {
            status: "M",
            oldFile: "docs/specification/components.md",
            file: "docs/specification/components.md",
          },
          {
            status: "M",
            oldFile: "docs/architecture/module-map.md",
            file: "docs/architecture/module-map.md",
          },
        ];

        const config = {
          mappings: {
            "src/taskpane/components": "docs/specification/components.md",
          },
          exclusions: [],
        };

        const result = checker.runValidation({
          modifiedFiles,
          config,
          getFileContent: defaultGetFileContent,
          readFile: defaultReadFile,
        });

        expect(result.success).toBe(true);
      });

      it("should fail validation with a descriptive error message when mapped central specification remains unchanged", () => {
        const modifiedFiles = [
          {
            status: "M",
            oldFile: "src/taskpane/components/button/index.ts",
            file: "src/taskpane/components/button/index.ts",
          },
          {
            status: "M",
            oldFile: "docs/architecture/module-map.md",
            file: "docs/architecture/module-map.md",
          },
        ];

        const config = {
          mappings: {
            "src/taskpane/components": "docs/specification/components.md",
          },
          exclusions: [],
        };

        const result = checker.runValidation({
          modifiedFiles,
          config,
          getFileContent: defaultGetFileContent,
          readFile: defaultReadFile,
        });

        expect(result.success).toBe(false);
        expect(result.errors[0]).toContain(
          "Public API changed in mapped folder 'src/taskpane/components'"
        );
        expect(result.errors[0]).toContain("docs/specification/components.md");
      });

      it("should respect strict mapping assertion and fail even if adjacent markdown is changed but the mapped file is not", () => {
        const modifiedFiles = [
          {
            status: "M",
            oldFile: "src/taskpane/components/button/index.ts",
            file: "src/taskpane/components/button/index.ts",
          },
          {
            status: "M",
            oldFile: "docs/architecture/module-map.md",
            file: "docs/architecture/module-map.md",
          },
          // Adjacent md file is modified, but NOT the mapped central spec
          {
            status: "M",
            oldFile: "src/taskpane/components/button/README.md",
            file: "src/taskpane/components/button/README.md",
          },
        ];

        const config = {
          mappings: {
            "src/taskpane/components": "docs/specification/components.md",
          },
          exclusions: [],
        };

        const result = checker.runValidation({
          modifiedFiles,
          config,
          getFileContent: defaultGetFileContent,
          readFile: defaultReadFile,
        });

        expect(result.success).toBe(false);
        expect(result.errors[0]).toContain(
          "Public API changed in mapped folder 'src/taskpane/components'"
        );
        expect(result.errors[0]).toContain("docs/specification/components.md");
      });
    });

    describe("Fallback Parent Search", () => {
      it("should pass if adjacent markdown and module map are updated", () => {
        const modifiedFiles = [
          {
            status: "M",
            oldFile: "src/taskpane/components/button/index.ts",
            file: "src/taskpane/components/button/index.ts",
          },
          {
            status: "M",
            oldFile: "src/taskpane/components/button/README.md",
            file: "src/taskpane/components/button/README.md",
          },
          {
            status: "M",
            oldFile: "docs/architecture/module-map.md",
            file: "docs/architecture/module-map.md",
          },
        ];

        const result = checker.runValidation({
          modifiedFiles,
          config: { mappings: {}, exclusions: [] },
          getFileContent: defaultGetFileContent,
          readFile: defaultReadFile,
        });

        expect(result.success).toBe(true);
      });

      it("should pass if a markdown file is updated in a parent directory and module map is updated", () => {
        const modifiedFiles = [
          {
            status: "M",
            oldFile: "src/taskpane/components/button/index.ts",
            file: "src/taskpane/components/button/index.ts",
          },
          // MD is modified in parent directory "src/taskpane/components" instead of "src/taskpane/components/button"
          {
            status: "M",
            oldFile: "src/taskpane/components/specification.md",
            file: "src/taskpane/components/specification.md",
          },
          {
            status: "M",
            oldFile: "docs/architecture/module-map.md",
            file: "docs/architecture/module-map.md",
          },
        ];

        const result = checker.runValidation({
          modifiedFiles,
          config: { mappings: {}, exclusions: [] },
          getFileContent: defaultGetFileContent,
          readFile: defaultReadFile,
        });

        expect(result.success).toBe(true);
      });

      it("should fail with a descriptive error message if no markdown is updated in parent hierarchy", () => {
        const modifiedFiles = [
          {
            status: "M",
            oldFile: "src/taskpane/components/button/index.ts",
            file: "src/taskpane/components/button/index.ts",
          },
          {
            status: "M",
            oldFile: "docs/architecture/module-map.md",
            file: "docs/architecture/module-map.md",
          },
        ];

        const result = checker.runValidation({
          modifiedFiles,
          config: { mappings: {}, exclusions: [] },
          getFileContent: defaultGetFileContent,
          readFile: defaultReadFile,
        });

        expect(result.success).toBe(false);
        expect(result.errors[0]).toContain(
          "no adjacent markdown specification was updated in src/taskpane/components/button or its parent directories"
        );
      });
    });
  });
});
