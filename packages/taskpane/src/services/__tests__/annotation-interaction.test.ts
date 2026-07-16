/**
 * @issue #84
 */
import { AnnotationType, AnnotationTargetType, Annotation } from "@crf-xl/core/types/annotation";

import {
  applyAnnotation,
  editAnnotation,
  removeAnnotation,
  detectAnnotationConflicts,
} from "../annotation-service";

/* global jest, describe, it, expect */

describe("Annotation Interaction Semantics", () => {
  let mockContext: any;
  let mockSheet: any;
  let mockAdd: any;

  beforeEach(() => {
    mockAdd = jest.fn().mockReturnValue({ load: jest.fn(), id: "comment-1" });
    mockSheet = {
      getRange: jest.fn().mockReturnValue({
        load: jest.fn(),
        rowIndex: 1,
        getComments: jest.fn().mockReturnValue({
          load: jest.fn(),
          items: [],
        }),
      }),
      getRangeByIndexes: jest.fn().mockReturnValue({
        load: jest.fn(),
        values: [["test_val"]],
      }),
      comments: {
        add: mockAdd,
        getComments: jest.fn().mockReturnValue({
          load: jest.fn(),
          items: [],
        }),
      },
    };

    mockContext = {
      workbook: {
        customXmlParts: {
          getByNamespace: jest.fn().mockReturnValue({
            load: jest.fn(),
            items: [],
          }),
          add: jest.fn().mockReturnValue({
            setXml: jest.fn(),
            load: jest.fn(),
          }),
        },
        worksheets: {
          getItem: jest.fn().mockReturnValue(mockSheet),
        },
      },
      sync: jest.fn(),
    };

    (global as any).Excel = {
      run: (callback: any) => callback(mockContext),
    };

    (global as any).DOMParser = class {
      parseFromString(xml: string) {
        const annotationNodes: any[] = [];
        if (xml.includes("<Annotation>")) {
          const matches = xml.match(/<Annotation>[\s\S]*?<\/Annotation>/g) || [];
          matches.forEach((m) => {
            annotationNodes.push({
              getElementsByTagName: (tag: string) => {
                const tagMatch = m.match(new RegExp(`<${tag}>(.*?)<\/${tag}>`));
                const val = tagMatch ? tagMatch[1] : "";
                if (tag === "Content" && m.includes("<![CDATA[")) {
                  const cdataMatch = m.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
                  return [{ textContent: cdataMatch ? cdataMatch[1] : val }];
                }
                return [{ textContent: val }];
              },
            });
          });
        }

        return {
          getElementsByTagName: (name: string) => {
            if (name === "Annotations")
              return [{ appendChild: jest.fn(), replaceChild: jest.fn(), removeChild: jest.fn() }];
            if (name === "Annotation") return annotationNodes;
            return [];
          },
          documentElement: {},
          importNode: (node: any) => node,
        };
      }
    };

    (global as any).XMLSerializer = class {
      serializeToString() {
        return "<Annotations></Annotations>";
      }
    };
  });

  it("should format annotation content with hybrid metadata", async () => {
    const annotation: Annotation = {
      id: "",
      type: AnnotationType.SDTM,
      targetType: AnnotationTargetType.CELL,
      anchor: {
        address: "A1",
        sheetName: "Sheet1",
        logicalId: "VSORRES",
      },
      content: "Test annotation",
      timestamp: new Date().toISOString(),
      version: 1,
    };

    await applyAnnotation("Sheet1", "A1", annotation);

    expect(mockAdd).toHaveBeenCalledWith(expect.anything(), "[SDTM:VSORRES]\nTest annotation");
    expect(annotation.id).toBe("comment-1");
  });

  it("should edit annotation and preserve metadata prefix", async () => {
    const mockComment = {
      content: "[SDTM:VSORRES]\nOld content",
      load: jest.fn(),
      id: "comment-1",
    };
    mockSheet.getRange.mockReturnValue({
      getComments: jest.fn().mockReturnValue({
        load: jest.fn(),
        items: [mockComment],
      }),
    });

    await editAnnotation("Sheet1", "A1", "New content");

    expect(mockComment.content).toBe("[SDTM:VSORRES]\nNew content");
  });

  it("should remove annotations from range", async () => {
    const mockComment = {
      delete: jest.fn(),
      load: jest.fn(),
      id: "comment-1",
    };
    mockSheet.getRange.mockReturnValue({
      getComments: jest.fn().mockReturnValue({
        load: jest.fn(),
        items: [mockComment],
      }),
    });

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
            address: "Sheet1!A1",
          },
        },
        {
          content: "[ADaM:VAR2]\nContent 2",
          id: "2",
          location: {
            load: jest.fn(),
            address: "Sheet1!A1",
          },
        },
      ],
    };
    const mockSheet = {
      comments: mockComments,
    };
    const mockContext = {
      workbook: {
        worksheets: {
          getItem: jest.fn().mockReturnValue(mockSheet),
        },
      },
      sync: jest.fn(),
    };

    (global as any).Excel = {
      run: (callback: any) => callback(mockContext),
    };

    (mockContext.workbook as any).customXmlParts = {
      getByNamespace: jest.fn().mockReturnValue({
        load: jest.fn(),
        items: [
          {
            load: jest.fn(),
            xml: `<Annotations xmlns="http://schemas.crf-xl.com/annotations">
                        <Annotation>
                            <Id>1</Id>
                            <Type>SDTM</Type>
                            <TargetType>Cell</TargetType>
                            <Anchor>
                                <Address>A1</Address>
                                <LogicalId>VAR1</LogicalId>
                                <SheetName>Sheet1</SheetName>
                            </Anchor>
                            <Content>Content 1</Content>
                            <Timestamp>2023-01-01T00:00:00Z</Timestamp>
                            <Version>1</Version>
                            <Metadata>{}</Metadata>
                        </Annotation>
                        <Annotation>
                            <Id>2</Id>
                            <Type>ADaM</Type>
                            <TargetType>Cell</TargetType>
                            <Anchor>
                                <Address>A1</Address>
                                <LogicalId>VAR2</LogicalId>
                                <SheetName>Sheet1</SheetName>
                            </Anchor>
                            <Content>Content 2</Content>
                            <Timestamp>2023-01-01T00:00:00Z</Timestamp>
                            <Version>1</Version>
                            <Metadata>{}</Metadata>
                        </Annotation>
                  </Annotations>`,
          },
        ],
      }),
    };

    const issues = await detectAnnotationConflicts("Sheet1");

    expect(issues.length).toBe(1);
    expect(issues[0].message).toContain("Conflicting annotation type");
  });
});
