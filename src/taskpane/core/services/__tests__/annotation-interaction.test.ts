import { AnnotationType, AnnotationTargetType, Annotation } from "../../types";
import { applyAnnotation, editAnnotation, removeAnnotation, detectAnnotationConflicts } from "../annotation-service";

/* global jest, describe, it, expect */

describe("Annotation Interaction Semantics", () => {
  it("should format annotation content with hybrid metadata", async () => {
    // Mock Excel.run
    const mockAdd = jest.fn().mockReturnValue({ load: jest.fn(), id: "comment-1" });
    const mockSheet = {
      getRange: jest.fn().mockReturnValue({}),
      comments: {
        add: mockAdd
      }
    };
    const mockContext = {
      workbook: {
        worksheets: {
          getItem: jest.fn().mockReturnValue(mockSheet)
        }
      },
      sync: jest.fn()
    };

    (global as any).Excel = {
      run: (callback: any) => callback(mockContext)
    };

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
      timestamp: new Date().toISOString()
    };

    await applyAnnotation("Sheet1", "A1", annotation);

    expect(mockAdd).toHaveBeenCalledWith(expect.anything(), "[SDTM:VSORRES]\nTest annotation");
    expect(annotation.id).toBe("comment-1");
  });

  it("should edit annotation and preserve metadata prefix", async () => {
    const mockComment = {
      content: "[SDTM:VSORRES]\nOld content",
      load: jest.fn()
    };
    const mockRange = {
      getComments: jest.fn().mockReturnValue({
        load: jest.fn(),
        items: [mockComment]
      })
    };
    const mockSheet = {
      getRange: jest.fn().mockReturnValue(mockRange)
    };
    const mockContext = {
      workbook: {
        worksheets: {
          getItem: jest.fn().mockReturnValue(mockSheet)
        }
      },
      sync: jest.fn()
    };

    (global as any).Excel = {
      run: (callback: any) => callback(mockContext)
    };

    await editAnnotation("Sheet1", "A1", "New content");

    expect(mockComment.content).toBe("[SDTM:VSORRES]\nNew content");
  });

  it("should remove annotations from range", async () => {
    const mockComment = {
      delete: jest.fn()
    };
    const mockRange = {
      getComments: jest.fn().mockReturnValue({
        load: jest.fn(),
        items: [mockComment]
      })
    };
    const mockSheet = {
      getRange: jest.fn().mockReturnValue(mockRange)
    };
    const mockContext = {
      workbook: {
        worksheets: {
          getItem: jest.fn().mockReturnValue(mockSheet)
        }
      },
      sync: jest.fn()
    };

    (global as any).Excel = {
      run: (callback: any) => callback(mockContext)
    };

    await removeAnnotation("Sheet1", "A1");

    expect(mockComment.delete).toHaveBeenCalled();
  });

  it("should detect overlapping incompatible annotations", async () => {
    const mockComments = {
      load: jest.fn(),
      items: [
        {
          content: "[SDTM:VAR1]\nContent 1",
          id: "1",
          location: {
            load: jest.fn(),
            address: "Sheet1!A1"
          }
        },
        {
          content: "[ADaM:VAR2]\nContent 2",
          id: "2",
          location: {
            load: jest.fn(),
            address: "Sheet1!A1"
          }
        }
      ]
    };
    const mockSheet = {
      comments: mockComments
    };
    const mockContext = {
      workbook: {
        worksheets: {
          getItem: jest.fn().mockReturnValue(mockSheet)
        }
      },
      sync: jest.fn()
    };

    (global as any).Excel = {
      run: (callback: any) => callback(mockContext)
    };

    const issues = await detectAnnotationConflicts("Sheet1");

    expect(issues.length).toBe(1);
    expect(issues[0].message).toContain("Overlapping incompatible annotations");
  });
});
