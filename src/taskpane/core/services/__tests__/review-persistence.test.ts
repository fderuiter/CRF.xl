/**
 * @issue #57
 */
import { ReviewerComment } from "../../types/reviewer";
import { saveComment, loadComments, deleteComment } from "../review-service";

/* global jest, describe, it, expect, beforeEach */

describe("Review Service Persistence", () => {
  let mockContext: any;
  let mockCustomXmlParts: any;

  beforeEach(() => {
    mockCustomXmlParts = {
      getByNamespace: jest.fn().mockReturnValue({
        load: jest.fn(),
        items: [],
      }),
      add: jest.fn().mockReturnValue({
        setXml: jest.fn(),
        load: jest.fn(),
      }),
    };

    mockContext = {
      workbook: {
        customXmlParts: mockCustomXmlParts,
      },
      sync: jest.fn(),
    };

    (global as any).Excel = {
      run: (callback: any) => callback(mockContext),
    };

    // DOMParser/XMLSerializer mocks
    (global as any).DOMParser = class {
      parseFromString(_xml: string) {
        return {
          getElementsByTagName: (name: string) => {
            if (name === "ReviewerComments")
              return [{ appendChild: jest.fn(), replaceChild: jest.fn(), removeChild: jest.fn() }];
            if (name === "ReviewerComment") return [];
            if (name === "Id") return [];
            return [];
          },
          documentElement: {},
          importNode: (node: any) => node,
        };
      }
    };

    (global as any).XMLSerializer = class {
      serializeToString() {
        return "<ReviewerComments></ReviewerComments>";
      }
    };
  });

  it("should save comment to store", async () => {
    const comment: ReviewerComment = {
      id: "rev-123",
      author: "Reviewer A",
      text: "Issue found",
      timestamp: new Date().toISOString(),
      status: "open",
      targetEntityId: "VAR1",
    };

    await saveComment(comment);

    expect(mockCustomXmlParts.getByNamespace).toHaveBeenCalledWith(
      "http://schemas.crf-xl.com/review"
    );
  });

  it("should load comments from store", async () => {
    mockCustomXmlParts.getByNamespace.mockReturnValue({
      load: jest.fn(),
      items: [
        {
          load: jest.fn(),
          xml: `<ReviewerComments xmlns="http://schemas.crf-xl.com/review">
                <ReviewerComment>
                  <Id>id-1</Id>
                  <Author>User</Author>
                  <Text>Text</Text>
                  <Timestamp>2026-01-01</Timestamp>
                  <Status>open</Status>
                  <TargetEntityId>VAR1</TargetEntityId>
                </ReviewerComment>
              </ReviewerComments>`,
        },
      ],
    });

    (global as any).DOMParser = class {
      parseFromString() {
        return {
          getElementsByTagName: (name: string) => {
            if (name === "ReviewerComment")
              return [
                {
                  getElementsByTagName: (subName: string) => {
                    const values: any = {
                      Id: "id-1",
                      Author: "User",
                      Text: "Text",
                      Timestamp: "2026-01-01",
                      Status: "open",
                      TargetEntityId: "VAR1",
                    };
                    return [{ textContent: values[subName] }];
                  },
                },
              ];
            return [];
          },
        };
      }
    };

    const comments = await loadComments();
    expect(comments.length).toBe(1);
    expect(comments[0].id).toBe("id-1");
  });

  it("should delete from store", async () => {
    await deleteComment("id-1");
    expect(mockCustomXmlParts.getByNamespace).toHaveBeenCalledWith(
      "http://schemas.crf-xl.com/review"
    );
  });
});
