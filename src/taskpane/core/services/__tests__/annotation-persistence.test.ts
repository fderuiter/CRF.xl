/**
 * @issue #84
 */
import { AnnotationType, AnnotationTargetType, Annotation } from "../../types";
import {
  applyAnnotation,
  deleteAnnotationFromStore,
  detectOrphans,
  bulkApplyAnnotations
} from "../annotation-service";

/* global jest, describe, it, expect, beforeEach */

describe("Annotation Persistence & Lifecycle", () => {
  let mockContext: any;
  let mockCustomXmlParts: any;
  let mockComments: any;

  beforeEach(() => {
    mockComments = {
      add: jest.fn().mockReturnValue({ load: jest.fn(), id: "comment-123" }),
      items: []
    };

    mockCustomXmlParts = {
      getByNamespace: jest.fn().mockReturnValue({
        load: jest.fn(),
        items: []
      }),
      add: jest.fn().mockReturnValue({
        setXml: jest.fn(),
        load: jest.fn()
      })
    };

    mockContext = {
      workbook: {
        customXmlParts: mockCustomXmlParts,
        worksheets: {
          getItem: jest.fn().mockReturnValue({
            getRange: jest.fn().mockReturnValue({
               getComments: jest.fn().mockReturnValue({
                 load: jest.fn(),
                 items: []
               })
            }),
            comments: mockComments
          }),
          getItemOrNullObject: jest.fn().mockReturnValue({
            isNullObject: false,
            load: jest.fn(),
            getRange: jest.fn().mockReturnValue({
               getComments: jest.fn().mockReturnValue({
                 load: jest.fn(),
                 items: []
               })
            }),
            comments: mockComments
          })
        }
      },
      sync: jest.fn()
    };

    (global as any).Excel = {
      run: (callback: any) => callback(mockContext)
    };

    // DOMParser/XMLSerializer mocks
    (global as any).DOMParser = class {
      parseFromString(_xml: string) {
        return {
          getElementsByTagName: (name: string) => {
            if (name === "Annotations") return [{ appendChild: jest.fn(), replaceChild: jest.fn(), removeChild: jest.fn() }];
            if (name === "Annotation") return [];
            if (name === "Id") return [];
            return [];
          },
          documentElement: {},
          importNode: (node: any) => node
        };
      }
    };

    (global as any).XMLSerializer = class {
      serializeToString() {
        return "<Annotations></Annotations>";
      }
    };
  });

  it("should save annotation to store when applied", async () => {
    const annotation: Annotation = {
      id: "test-id",
      type: AnnotationType.SDTM,
      targetType: AnnotationTargetType.CELL,
      anchor: {
        address: "A1",
        sheetName: "Sheet1",
        logicalId: "LBORRES"
      },
      content: "Test Content",
      timestamp: new Date().toISOString(),
      version: 1
    };

    await applyAnnotation("Sheet1", "A1", annotation);

    expect(mockCustomXmlParts.getByNamespace).toHaveBeenCalledWith("http://schemas.crf-xl.com/annotations");
  });

  it("should detect orphans when comments are missing", async () => {
    // Setup store with one annotation
    mockCustomXmlParts.getByNamespace.mockReturnValue({
        load: jest.fn(),
        items: [{
            load: jest.fn(),
            xml: `<Annotations xmlns="http://schemas.crf-xl.com/annotations">
                    <Annotation>
                        <Id>id-1</Id>
                        <Anchor>
                            <SheetName>Sheet1</SheetName>
                            <Address>A1</Address>
                        </Anchor>
                    </Annotation>
                  </Annotations>`
        }]
    });

    // Mock DOMParser for this specific test
    (global as any).DOMParser = class {
        parseFromString() {
          return {
            getElementsByTagName: (name: string) => {
              if (name === "Annotation") return [{
                  getElementsByTagName: (subName: string) => {
                      if (subName === "Id") return [{ textContent: "id-1" }];
                      if (subName === "SheetName") return [{ textContent: "Sheet1" }];
                      if (subName === "Address") return [{ textContent: "A1" }];
                      return [];
                  }
              }];
              return [];
            }
          };
        }
      };

    // Mock comments to be empty (not found)
    mockComments.items = [];

    const orphans = await detectOrphans();
    expect(orphans.length).toBe(1);
    expect(orphans[0].id).toBe("id-1");
  });

  it("should delete from store", async () => {
      await deleteAnnotationFromStore("some-id");
      expect(mockCustomXmlParts.getByNamespace).toHaveBeenCalled();
  });

  it("should bulk apply annotations", async () => {
      const annotations: Annotation[] = [{
          id: "bulk-1",
          type: AnnotationType.COMMENT,
          targetType: AnnotationTargetType.CELL,
          anchor: { address: "B2", sheetName: "Sheet1" },
          content: "Bulk",
          timestamp: "",
          version: 1
      }];

      await bulkApplyAnnotations(annotations);
      expect(mockComments.add).toHaveBeenCalled();
  });
});
