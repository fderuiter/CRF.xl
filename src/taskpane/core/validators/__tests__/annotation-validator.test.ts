/**
 * @issue #84
 */
import { detectConflicts, getRepairPolicy, RepairConfidence, validateAnnotationTarget, ExcelRangeData } from "../annotation-validator";
import { Annotation, AnnotationType, AnnotationTargetType } from "../../types";

describe("AnnotationValidator", () => {
  const mockAnnotation = (id: string, type: AnnotationType, address: string): Annotation => ({
    id,
    type,
    targetType: AnnotationTargetType.CELL,
    anchor: {
      address,
      sheetName: "Sheet1",
      logicalId: "VAR1",
    },
    content: "Test Content",
    timestamp: new Date().toISOString(),
    version: 1,
  });

  describe("validateAnnotationTarget", () => {
    it("should return ProtectedRange issue when range is locked and worksheet is protected", () => {
      const rangeData: ExcelRangeData = {
        address: "A1",
        isLocked: true,
        isWorksheetProtected: true,
        isMerged: false,
      };
      const issues = validateAnnotationTarget(rangeData);
      expect(issues.length).toBe(1);
      expect(issues[0].category).toBe("ProtectedRange");
    });

    it("should return MergedCell issue when range is part of a merged cell and address differs", () => {
      const rangeData: ExcelRangeData = {
        address: "A1",
        isLocked: false,
        isWorksheetProtected: false,
        isMerged: true,
        mergedAddress: "A1:B2",
      };
      const issues = validateAnnotationTarget(rangeData);
      expect(issues.length).toBe(1);
      expect(issues[0].category).toBe("MergedCell");
    });

    it("should return empty issues array when range is valid", () => {
      const rangeData: ExcelRangeData = {
        address: "A1",
        isLocked: false,
        isWorksheetProtected: false,
        isMerged: false,
      };
      const issues = validateAnnotationTarget(rangeData);
      expect(issues.length).toBe(0);
    });
  });

  describe("detectConflicts", () => {
    it("should detect conflict when different types overlap on the same address", () => {
      const existing = [mockAnnotation("1", AnnotationType.SDTM, "A1")];
      const candidate = mockAnnotation("2", AnnotationType.ADAM, "A1");

      const issues = detectConflicts(existing, candidate);
      expect(issues.length).toBe(1);
      expect(issues[0].category).toBe("Conflict");
      expect(issues[0].confidence).toBe(RepairConfidence.Low);
    });

    it("should detect duplicate when same type overlaps on the same address with different ID", () => {
      const existing = [mockAnnotation("1", AnnotationType.SDTM, "A1")];
      const candidate = mockAnnotation("2", AnnotationType.SDTM, "A1");

      const issues = detectConflicts(existing, candidate);
      expect(issues.length).toBe(1);
      expect(issues[0].category).toBe("Conflict");
      expect(issues[0].confidence).toBe(RepairConfidence.Medium);
      expect(issues[0].message).toContain("Duplicate");
    });

    it("should not detect conflict when annotations are on different addresses", () => {
      const existing = [mockAnnotation("1", AnnotationType.SDTM, "A1")];
      const candidate = mockAnnotation("2", AnnotationType.ADAM, "B2");

      const issues = detectConflicts(existing, candidate);
      expect(issues.length).toBe(0);
    });

    it("should not detect conflict when updating the same annotation", () => {
      const existing = [mockAnnotation("1", AnnotationType.SDTM, "A1")];
      const candidate = mockAnnotation("1", AnnotationType.SDTM, "A1");

      const issues = detectConflicts(existing, candidate);
      expect(issues.length).toBe(0);
    });
  });

  describe("getRepairPolicy", () => {
    it("should return AutoHeal for High confidence", () => {
      const policy = getRepairPolicy({
        category: "Orphaned",
        message: "Test",
        confidence: RepairConfidence.High,
      });
      expect(policy.action).toBe("AutoHeal");
    });

    it("should return Warn for Medium confidence", () => {
      const policy = getRepairPolicy({
        category: "MergedCell",
        message: "Test",
        confidence: RepairConfidence.Medium,
      });
      expect(policy.action).toBe("Warn");
    });

    it("should return Block for Low confidence", () => {
      const policy = getRepairPolicy({
        category: "ProtectedRange",
        message: "Test",
        confidence: RepairConfidence.Low,
      });
      expect(policy.action).toBe("Block");
    });
  });
});
