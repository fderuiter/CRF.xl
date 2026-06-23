/* eslint-disable no-undef */
/**
 * @issue #28
 */
import { readFileSync } from "fs";
import { join } from "path";
import { buildCtImportPlan, executeCtImport, ConflictResolution } from "../ct-import-service";
import { mapCdiscApiResponseToCrfCodelists, CrfCodelistsRow } from "../cdisc-ct-mapping-service";

// ──────────────────────────────────────────────────────────────────────────────
// Fixture helpers
// ──────────────────────────────────────────────────────────────────────────────

function loadFixture(name: string): unknown {
  const path = join(process.cwd(), "test", "fixtures", "cdisc-library", name);
  return JSON.parse(readFileSync(path, "utf8"));
}

function getMappedRows(): CrfCodelistsRow[] {
  const bundle = loadFixture("ct-mapping-bundle.response.json");
  const result = mapCdiscApiResponseToCrfCodelists(bundle);
  if (!result.ok) throw new Error("fixture mapping failed");
  return result.rows;
}

// ──────────────────────────────────────────────────────────────────────────────
// Mock Excel.run — simulates a minimal Office.js environment
// ──────────────────────────────────────────────────────────────────────────────

interface MockSheet {
  isNullObject: boolean;
  protection: { protected: boolean };
  rows: (string | number | boolean)[][];
}

function makeMockExcel(sheet: MockSheet | null) {
  const mockContext = {
    workbook: {
      worksheets: {
        getItemOrNullObject: () => {
          if (!sheet) {
            return {
              isNullObject: true,
              load: () => {},
            };
          }
          return {
            isNullObject: false,
            load: () => {},
            protection: sheet.protection,
            getUsedRange: () => ({
              load: () => {},
              values: sheet.rows,
              rowCount: sheet.rows.length,
              clear: () => {
                // Simulate clearing rows beyond new data
              },
            }),
            getRangeByIndexes: (
              rowStart: number,

              rowCount: number
            ) => ({
              load: () => {},
              get values() {
                return sheet.rows.slice(rowStart, rowStart + rowCount);
              },
              set values(v: (string | number | boolean)[][]) {
                for (let i = 0; i < v.length; i++) {
                  sheet.rows[rowStart + i] = v[i];
                }
              },
              clear: () => {},
            }),
          };
        },
      },
      names: {
        getItemOrNullObject: () => ({
          isNullObject: false,
          delete: () => {},
        }),
        add: () => {},
      },
    },
    sync: async () => {},
  };

  return async (fn: (ctx: typeof mockContext) => Promise<unknown>) => fn(mockContext);
}

// ──────────────────────────────────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────────────────────────────────

describe("ct-import-service", () => {
  // ── buildCtImportPlan ──────────────────────────────────────────────────────

  describe("buildCtImportPlan", () => {
    it("classifies all incoming rows as auto-insert when workbook is empty", () => {
      const incomingRows = getMappedRows();
      const plan = buildCtImportPlan([], incomingRows);

      expect(plan.autoInsertIds.size).toBeGreaterThan(0);
      expect(plan.autoOverwriteIds.size).toBe(0);
      expect(plan.skipIdenticalIds.size).toBe(0);
      expect(plan.conflictIds.size).toBe(0);
      expect(plan.conflicts).toHaveLength(0);

      // All incoming codelist IDs should be in autoInsertIds
      const uniqueIncomingIds = new Set(incomingRows.map((r) => r.codelistId));
      uniqueIncomingIds.forEach((id) => {
        expect(plan.autoInsertIds.has(id)).toBe(true);
      });
    });

    it("classifies all rows as skip-identical when existing rows match incoming exactly", () => {
      const incomingRows = getMappedRows();
      // Existing rows are identical to incoming
      const plan = buildCtImportPlan(incomingRows, incomingRows);

      expect(plan.skipIdenticalIds.size).toBeGreaterThan(0);
      expect(plan.autoInsertIds.size).toBe(0);
      expect(plan.conflictIds.size).toBe(0);
    });

    it("classifies codelist as auto-overwrite when incoming version is unambiguously newer", () => {
      const incomingRows = getMappedRows();
      // Make existing rows look like an older version
      const olderExisting = incomingRows.map((r) => ({ ...r, codelistVersion: "2024-01-01" }));

      const plan = buildCtImportPlan(olderExisting, incomingRows);

      // All codelists should be auto-overwrite (newer version coming in)
      expect(plan.autoOverwriteIds.size).toBeGreaterThan(0);
      expect(plan.conflictIds.size).toBe(0);
    });

    it("classifies codelist as conflict when existing rows differ without clear version order", () => {
      const incomingRows = getMappedRows();
      // Existing rows have no version info (manually entered) but different decode values
      const existingWithDifferentDecode = incomingRows.map((r) => ({
        ...r,
        decode: r.decode + " (modified)",
        codelistVersion: "",
      }));

      const plan = buildCtImportPlan(existingWithDifferentDecode, incomingRows);

      expect(plan.conflictIds.size).toBeGreaterThan(0);
      expect(plan.conflicts.length).toBe(plan.conflictIds.size);
      plan.conflicts.forEach((c) => {
        expect(c.codelistId).toBeTruthy();
        expect(c.incomingTermCount).toBeGreaterThan(0);
        expect(c.existingTermCount).toBeGreaterThan(0);
        expect(c.message).toBeTruthy();
      });
    });

    it("returns conflict items with proper metadata for the UI", () => {
      const incomingRows = getMappedRows();
      const existingModified = incomingRows.map((r) =>
        r.codelistId === "SEX" ? { ...r, decode: "Modified decode", codelistVersion: "" } : r
      );

      const plan = buildCtImportPlan(existingModified, incomingRows);

      const sexConflict = plan.conflicts.find((c) => c.codelistId === "SEX");
      expect(sexConflict).toBeDefined();
      expect(sexConflict?.codelistName).toBe("Sex");
      expect(sexConflict?.incomingTermCount).toBe(2);
      expect(sexConflict?.existingTermCount).toBe(2);
    });

    it("handles malformed/empty incoming rows without throwing", () => {
      const plan = buildCtImportPlan([], []);

      expect(plan.autoInsertIds.size).toBe(0);
      expect(plan.skipIdenticalIds.size).toBe(0);
      expect(plan.conflictIds.size).toBe(0);
      expect(plan.conflicts).toHaveLength(0);
    });
  });

  // ── executeCtImport ────────────────────────────────────────────────────────

  describe("executeCtImport", () => {
    it("imports all rows into an empty workbook and returns correct added count", async () => {
      const incomingRows = getMappedRows();
      const existingRows: CrfCodelistsRow[] = [];

      const sheet: MockSheet = {
        isNullObject: false,
        protection: { protected: false },
        rows: [["Codelist ID", "Codelist Name", "Coded Value", "Decode"]],
      };

      (global as unknown as { Excel: { run: unknown } }).Excel = {
        run: makeMockExcel(sheet),
      };

      const plan = buildCtImportPlan(existingRows, incomingRows);
      const summary = await executeCtImport(existingRows, plan, new Map());

      expect(summary.added).toBe(incomingRows.length);
      expect(summary.updated).toBe(0);
      expect(summary.skipped).toBe(0);
      expect(summary.failed).toBe(0);
      expect(summary.errors).toHaveLength(0);
    });

    it("reports skipped count when all incoming rows are identical to existing", async () => {
      const incomingRows = getMappedRows();

      const sheet: MockSheet = {
        isNullObject: false,
        protection: { protected: false },
        rows: [["Codelist ID", "Codelist Name", "Coded Value", "Decode"]],
      };

      (global as unknown as { Excel: { run: unknown } }).Excel = {
        run: makeMockExcel(sheet),
      };

      const plan = buildCtImportPlan(incomingRows, incomingRows);
      const summary = await executeCtImport(incomingRows, plan, new Map());

      expect(summary.skipped).toBe(incomingRows.length);
      expect(summary.added).toBe(0);
      expect(summary.updated).toBe(0);
      expect(summary.failed).toBe(0);
    });

    it("applies 'skip' conflict resolution — keeps existing, discards incoming", async () => {
      const incomingRows = getMappedRows();
      const existingConflict = incomingRows.map((r) => ({
        ...r,
        decode: "Old decode",
        codelistVersion: "",
      }));

      const sheet: MockSheet = {
        isNullObject: false,
        protection: { protected: false },
        rows: [["Codelist ID", "Codelist Name", "Coded Value", "Decode"]],
      };

      (global as unknown as { Excel: { run: unknown } }).Excel = {
        run: makeMockExcel(sheet),
      };

      const plan = buildCtImportPlan(existingConflict, incomingRows);
      // Resolve ALL conflicts with "skip"
      const resolutions = new Map<string, ConflictResolution>(
        Array.from(plan.conflictIds).map((id) => [id, "skip"])
      );
      const summary = await executeCtImport(existingConflict, plan, resolutions);

      // Everything that was in conflict should be skipped
      const conflictRowCount = incomingRows.filter((r) =>
        plan.conflictIds.has(r.codelistId)
      ).length;
      expect(summary.skipped).toBeGreaterThanOrEqual(conflictRowCount);
      expect(summary.failed).toBe(0);
    });

    it("applies 'overwrite' conflict resolution — replaces existing rows", async () => {
      const incomingRows = getMappedRows();
      const existingConflict = incomingRows.map((r) => ({
        ...r,
        decode: "Old decode",
        codelistVersion: "",
      }));

      const sheet: MockSheet = {
        isNullObject: false,
        protection: { protected: false },
        rows: [["Codelist ID", "Codelist Name", "Coded Value", "Decode"]],
      };

      (global as unknown as { Excel: { run: unknown } }).Excel = {
        run: makeMockExcel(sheet),
      };

      const plan = buildCtImportPlan(existingConflict, incomingRows);
      const resolutions = new Map<string, ConflictResolution>(
        Array.from(plan.conflictIds).map((id) => [id, "overwrite"])
      );
      const summary = await executeCtImport(existingConflict, plan, resolutions);

      const conflictRowCount = incomingRows.filter((r) =>
        plan.conflictIds.has(r.codelistId)
      ).length;
      expect(summary.updated).toBeGreaterThanOrEqual(conflictRowCount);
      expect(summary.failed).toBe(0);
    });

    it("applies 'append' conflict resolution — adds incoming alongside existing", async () => {
      const incomingRows = getMappedRows();
      const existingConflict = incomingRows.map((r) => ({
        ...r,
        decode: "Old decode",
        codelistVersion: "",
      }));

      const sheet: MockSheet = {
        isNullObject: false,
        protection: { protected: false },
        rows: [["Codelist ID", "Codelist Name", "Coded Value", "Decode"]],
      };

      (global as unknown as { Excel: { run: unknown } }).Excel = {
        run: makeMockExcel(sheet),
      };

      const plan = buildCtImportPlan(existingConflict, incomingRows);
      const resolutions = new Map<string, ConflictResolution>(
        Array.from(plan.conflictIds).map((id) => [id, "append"])
      );
      const summary = await executeCtImport(existingConflict, plan, resolutions);

      // Appended rows count as "added"
      const conflictRowCount = incomingRows.filter((r) =>
        plan.conflictIds.has(r.codelistId)
      ).length;
      expect(summary.added).toBeGreaterThanOrEqual(conflictRowCount);
      expect(summary.failed).toBe(0);
    });

    it("reports failure and rolls back counters when Excel write throws", async () => {
      const incomingRows = getMappedRows();
      const existingRows: CrfCodelistsRow[] = [];

      // Mock Excel to throw on sheet access
      (global as unknown as { Excel: { run: unknown } }).Excel = {
        run: async (fn: (ctx: unknown) => Promise<unknown>) => {
          return fn({
            workbook: {
              worksheets: {
                getItemOrNullObject: () => ({
                  isNullObject: false,
                  load: () => {},
                  protection: { protected: false },
                  getUsedRange: () => {
                    throw new Error("Simulated Excel write failure");
                  },
                }),
              },
              names: { getItemOrNullObject: () => ({ isNullObject: true }), add: () => {} },
            },
            sync: async () => {
              throw new Error("Simulated Excel write failure");
            },
          });
        },
      };

      const plan = buildCtImportPlan(existingRows, incomingRows);
      const summary = await executeCtImport(existingRows, plan, new Map());

      expect(summary.failed).toBeGreaterThan(0);
      expect(summary.added).toBe(0);
      expect(summary.errors.length).toBeGreaterThan(0);
    });

    it("reports protected sheet error without partially writing data", async () => {
      const incomingRows = getMappedRows();
      const existingRows: CrfCodelistsRow[] = [];

      const sheet: MockSheet = {
        isNullObject: false,
        protection: { protected: true }, // Protected sheet
        rows: [["Codelist ID", "Codelist Name", "Coded Value", "Decode"]],
      };

      (global as unknown as { Excel: { run: unknown } }).Excel = {
        run: makeMockExcel(sheet),
      };

      const plan = buildCtImportPlan(existingRows, incomingRows);
      const summary = await executeCtImport(existingRows, plan, new Map());

      expect(summary.failed).toBeGreaterThan(0);
      expect(summary.errors.length).toBeGreaterThan(0);
      expect(summary.errors[0]).toMatch(/protected/i);
    });

    it("invokes progress callback at each stage", async () => {
      const incomingRows = getMappedRows();
      const existingRows: CrfCodelistsRow[] = [];

      const sheet: MockSheet = {
        isNullObject: false,
        protection: { protected: false },
        rows: [["Codelist ID", "Codelist Name", "Coded Value", "Decode"]],
      };

      (global as unknown as { Excel: { run: unknown } }).Excel = {
        run: makeMockExcel(sheet),
      };

      const progressCalls: { stage: string; completed: number; total: number }[] = [];
      const plan = buildCtImportPlan(existingRows, incomingRows);
      await executeCtImport(existingRows, plan, new Map(), (stage, completed, total) => {
        progressCalls.push({ stage, completed, total });
      });

      expect(progressCalls.length).toBeGreaterThan(0);
      // Final call should signal write completion
      const lastCall = progressCalls[progressCalls.length - 1];
      expect(lastCall.stage).toMatch(/writ/i);
    });
  });
});
