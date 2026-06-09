import { inferSeverity, detectMovedOrRenamed, isClinicalWorksheet, isCodelistColumn } from "../clinical-utils";
import { StudyDiffListEntry, StudyDiffReport } from "../../types/diff";

describe("clinical-utils", () => {
  describe("inferSeverity", () => {
    it("returns high for removed", () => {
      expect(inferSeverity("removed")).toBe("high");
    });
    it("returns medium for modified", () => {
      expect(inferSeverity("modified")).toBe("medium");
    });
    it("returns low for added", () => {
      expect(inferSeverity("added")).toBe("low");
    });
  });

  describe("detectMovedOrRenamed", () => {
    const mockReport: StudyDiffReport = {
      baselineProtocolId: "B",
      currentProtocolId: "C",
      generatedAt: "",
      metadataDiff: { operation: "unchanged" },
      forms: [],
      items: [
        {
          operation: "added",
          formOid: "F1",
          itemOid: "I1",
          current: { itemOid: "I1", formOid: "F1", name: "TestItem", type: "text" } as any,
        },
        {
          operation: "removed",
          formOid: "F1",
          itemOid: "I1_OLD",
          baseline: { itemOid: "I1_OLD", formOid: "F1", name: "TestItem", type: "text" } as any,
        }
      ],
      codelists: [],
      rules: []
    };

    it("detects moved or renamed items and sets severity to medium", () => {
      const entries: StudyDiffListEntry[] = [
        {
          id: "items:F1:I1",
          group: "items",
          key: "F1.I1",
          title: "F1.I1",
          subtitle: "TestItem",
          operation: "added",
          changeClass: "added",
          severity: "low",
          subsystem: "Structure",
          area: "F1",
          changedFields: []
        },
        {
          id: "items:F1:I1_OLD",
          group: "items",
          key: "F1.I1_OLD",
          title: "F1.I1_OLD",
          subtitle: "TestItem",
          operation: "removed",
          changeClass: "removed",
          severity: "high",
          subsystem: "Structure",
          area: "F1",
          changedFields: []
        }
      ];

      const result = detectMovedOrRenamed(entries, mockReport);
      expect(result[0].changeClass).toBe("moved_or_renamed");
      expect(result[0].severity).toBe("medium");
      expect(result[1].changeClass).toBe("moved_or_renamed");
      expect(result[1].severity).toBe("medium");
    });
  });

  describe("isClinicalWorksheet", () => {
    it("returns true if prefix does not match", () => {
      expect(isClinicalWorksheet("Demographics", "_")).toBe(true);
    });
    it("returns false if prefix matches", () => {
      expect(isClinicalWorksheet("_System", "_")).toBe(false);
    });
  });

  describe("isCodelistColumn", () => {
    it("returns true if indexes match", () => {
      expect(isCodelistColumn(9, 9)).toBe(true);
    });
    it("returns false if indexes do not match", () => {
      expect(isCodelistColumn(5, 9)).toBe(false);
    });
  });
});
