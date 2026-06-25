/**
 * @issue #84
 */
import { AnnotationType, AnnotationTargetType, Annotation, AnnotationStatus } from "../../types";
import {
  applyAnnotation,
  editAnnotation,
  removeAnnotation,
  detectAnnotationConflicts,
  bulkApplyAnnotations,
  loadAnnotationsFromStore,
  saveAnnotationsToStore
} from "../annotation-service";

/* global jest, describe, it, expect, beforeEach */

describe("Annotation Interaction Semantics", () => {
  let mockContext: any;
  let mockCustomXmlParts: any[];

  beforeEach(() => {
    mockCustomXmlParts = [];
    mockContext = {
      workbook: {
        worksheets: {
          getItem: jest.fn().mockReturnValue({
            getRange: jest.fn().mockReturnValue({}),
            comments: {
              add: jest.fn().mockReturnValue({ load: jest.fn(), id: "comment-1" })
            }
          })
        },
        customXmlParts: {
          getByNamespace: jest.fn().mockImplementation(() => ({
            load: jest.fn(),
            get items() { return mockCustomXmlParts; }
          })),
          add: jest.fn().mockImplementation((xml) => {
            const part = {
              getXml: () => ({ value: xml }),
              delete: jest.fn().mockImplementation(function(this: any) {
                const idx = mockCustomXmlParts.indexOf(this);
                if (idx !== -1) mockCustomXmlParts.splice(idx, 1);
              })
            };
            mockCustomXmlParts.push(part);
            return part;
          })
        }
      },
      sync: jest.fn()
    };

    (global as any).Excel = {
      run: (callback: any) => callback(mockContext)
    };
  });

  it("should format annotation content with hybrid metadata and persist to store", async () => {
    const annotation: Annotation = {
      id: "",
      type: AnnotationType.SDTM,
      targetType: AnnotationTargetType.CELL,
      anchor: {
        address: "A1",
        sheetName: "Sheet1",
        logicalId: "VSORRES"
      },
      content: "Test annotation",
      timestamp: new Date().toISOString(),
      version: 1,
      status: AnnotationStatus.Active
    };

    const mockSheet = mockContext.workbook.worksheets.getItem();
    const mockAdd = mockSheet.comments.add;

    await applyAnnotation("Sheet1", "A1", annotation);

    expect(mockAdd).toHaveBeenCalledWith(expect.anything(), "[SDTM:VSORRES]\nTest annotation");
    expect(annotation.id).toBe("comment-1");

    // Verify persistence
    const stored = await loadAnnotationsFromStore();
    expect(stored.length).toBe(1);
    expect(stored[0].id).toBe("comment-1");
  });

  it("should edit annotation and preserve metadata prefix", async () => {
    const mockComment = {
      id: "comment-1",
      content: "[SDTM:VSORRES]\nOld content",
      load: jest.fn()
    };
    const mockRange = {
      getComments: jest.fn().mockReturnValue({
        load: jest.fn(),
        items: [mockComment]
      })
    };

    mockContext.workbook.worksheets.getItem().getRange.mockReturnValue(mockRange);

    // Pre-populate store
    await saveAnnotationsToStore([{
      id: "comment-1",
      type: AnnotationType.SDTM,
      targetType: AnnotationTargetType.CELL,
      anchor: { address: "A1", sheetName: "Sheet1", logicalId: "VSORRES" },
      content: "Old content",
      timestamp: new Date().toISOString(),
      version: 1,
      status: AnnotationStatus.Active
    }]);

    await editAnnotation("Sheet1", "A1", "New content");

    expect(mockComment.content).toBe("[SDTM:VSORRES]\nNew content");

    // Verify persistence update
    const stored = await loadAnnotationsFromStore();
    expect(stored[0].content).toBe("New content");
    expect(stored[0].version).toBe(2);
  });

  it("should remove annotations from range and store", async () => {
    const mockComment = {
      id: "comment-1",
      delete: jest.fn()
    };
    const mockRange = {
      getComments: jest.fn().mockReturnValue({
        load: jest.fn(),
        items: [mockComment]
      })
    };

    mockContext.workbook.worksheets.getItem().getRange.mockReturnValue(mockRange);

    // Pre-populate store
    await saveAnnotationsToStore([{
      id: "comment-1",
      type: AnnotationType.SDTM,
      targetType: AnnotationTargetType.CELL,
      anchor: { address: "A1", sheetName: "Sheet1", logicalId: "VSORRES" },
      content: "Content",
      timestamp: new Date().toISOString(),
      version: 1,
      status: AnnotationStatus.Active
    }]);

    await removeAnnotation("Sheet1", "A1");

    expect(mockComment.delete).toHaveBeenCalled();

    // Verify persistence removal
    const stored = await loadAnnotationsFromStore();
    expect(stored.length).toBe(0);
  });

  it("should detect overlapping incompatible annotations using store", async () => {
    // Pre-populate store
    await saveAnnotationsToStore([
      {
        id: "1",
        type: AnnotationType.SDTM,
        targetType: AnnotationTargetType.CELL,
        anchor: { address: "A1", sheetName: "Sheet1", logicalId: "VAR1" },
        content: "Content 1",
        timestamp: new Date().toISOString(),
        version: 1,
        status: AnnotationStatus.Active
      },
      {
        id: "2",
        type: AnnotationType.ADAM,
        targetType: AnnotationTargetType.CELL,
        anchor: { address: "A1", sheetName: "Sheet1", logicalId: "VAR2" },
        content: "Content 2",
        timestamp: new Date().toISOString(),
        version: 1,
        status: AnnotationStatus.Active
      }
    ]);

    const issues = await detectAnnotationConflicts("Sheet1");

    expect(issues.length).toBe(1);
    expect(issues[0].message).toContain("Overlapping incompatible annotations");
  });

  it("should bulk apply annotations and capture real IDs", async () => {
    const annotations: Annotation[] = [
      {
        id: "",
        type: AnnotationType.SDTM,
        targetType: AnnotationTargetType.CELL,
        anchor: { address: "A1", sheetName: "Sheet1", logicalId: "VAR1" },
        content: "Content 1",
        timestamp: new Date().toISOString(),
        version: 1,
        status: AnnotationStatus.Active
      },
      {
        id: "",
        type: AnnotationType.ADAM,
        targetType: AnnotationTargetType.CELL,
        anchor: { address: "A2", sheetName: "Sheet1", logicalId: "VAR2" },
        content: "Content 2",
        timestamp: new Date().toISOString(),
        version: 1,
        status: AnnotationStatus.Active
      }
    ];

    const mockAdd = mockContext.workbook.worksheets.getItem().comments.add;
    mockAdd
      .mockReturnValueOnce({ load: jest.fn(), id: "real-id-1" })
      .mockReturnValueOnce({ load: jest.fn(), id: "real-id-2" });

    await bulkApplyAnnotations(annotations.map(a => ({
      sheetName: a.anchor.sheetName,
      address: a.anchor.address,
      annotation: a
    })));

    expect(annotations[0].id).toBe("real-id-1");
    expect(annotations[1].id).toBe("real-id-2");

    // Verify store
    const stored = await loadAnnotationsFromStore();
    expect(stored.length).toBe(2);
    expect(stored[0].id).toBe("real-id-1");
    expect(stored[1].id).toBe("real-id-2");
  });
});
