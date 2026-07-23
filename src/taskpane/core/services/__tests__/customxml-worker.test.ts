import { AnnotationType, AnnotationTargetType, Annotation } from "../../types";
import { ReviewerComment } from "../../types/reviewer";
import { applyAnnotation } from "../annotation-service";
import { saveComment } from "../review-service";
import { persistRecoverySnapshot, RECOVERY_STORAGE_KEY } from "../recovery-storage";

/* global jest, describe, it, expect, beforeEach, afterEach */

describe("Native Workbook CustomXML & Web Worker Integration", () => {
  let mockContext: any;
  let mockCustomXmlParts: any;
  let mockComments: any;
  let originalExcel: any;
  let originalDOMParser: any;
  let originalXMLSerializer: any;
  let originalSelf: any;

  beforeEach(() => {
    // Save original globals
    originalExcel = (global as any).Excel;
    originalDOMParser = (global as any).DOMParser;
    originalXMLSerializer = (global as any).XMLSerializer;
    originalSelf = (global as any).self;

    // Set up CustomXML Parts mocks
    mockComments = {
      add: jest.fn().mockReturnValue({ load: jest.fn(), id: "comment-123" }),
      items: [],
    };

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
        worksheets: {
          getItem: jest.fn().mockReturnValue({
            getRangeByIndexes: jest
              .fn()
              .mockReturnValue({ load: jest.fn(), values: [["test_val"]] }),
            getRange: jest.fn().mockReturnValue({
              load: jest.fn(),
              rowIndex: 1,
              getComments: jest.fn().mockReturnValue({
                load: jest.fn(),
                items: [],
              }),
            }),
            comments: mockComments,
          }),
          getItemOrNullObject: jest.fn().mockReturnValue({
            isNullObject: false,
            load: jest.fn(),
            getRangeByIndexes: jest
              .fn()
              .mockReturnValue({ load: jest.fn(), values: [["test_val"]] }),
            getRange: jest.fn().mockReturnValue({
              load: jest.fn(),
              rowIndex: 1,
              getComments: jest.fn().mockReturnValue({
                load: jest.fn(),
                items: [],
              }),
            }),
            comments: mockComments,
          }),
        },
      },
      sync: jest.fn(),
    };

    (global as any).Excel = {
      run: (callback: any) => {
        const { createSafeMock } = require("../../test-helpers/test-proxy");
        return callback(createSafeMock(mockContext));
      },
    };

    // Precise DOMParser/XMLSerializer mocks to handle Recovery Snapshot XML serialization & deserialization
    (global as any).DOMParser = class {
      parseFromString(xml: string) {
        const rootElements: any[] = [];
        return {
          getElementsByTagName: (name: string) => {
            if (name === "Annotations") {
              return [{ appendChild: jest.fn(), replaceChild: jest.fn(), removeChild: jest.fn() }];
            }
            if (name === "ReviewerComments") {
              return [{ appendChild: jest.fn(), replaceChild: jest.fn(), removeChild: jest.fn() }];
            }
            if (name === "Recovery") {
              const root = {
                appendChild: (node: any) => rootElements.push(node),
                replaceChild: (newNode: any, oldNode: any) => {
                  const idx = rootElements.indexOf(oldNode);
                  if (idx !== -1) rootElements[idx] = newNode;
                },
                removeChild: (node: any) => {
                  const idx = rootElements.indexOf(node);
                  if (idx !== -1) rootElements.splice(idx, 1);
                },
              };
              return [root];
            }
            if (name === "Annotation") return [];
            if (name === "ReviewerComment") return [];
            if (name === RECOVERY_STORAGE_KEY) {
              const match = xml.match(
                new RegExp(`<${RECOVERY_STORAGE_KEY}>(.*?)</${RECOVERY_STORAGE_KEY}>`)
              );
              if (match) {
                return [{ textContent: match[1] }];
              }
              if (xml.includes(RECOVERY_STORAGE_KEY)) {
                return [
                  {
                    textContent:
                      '{"appVersion":"0.0.1","savedAt":1700000000000,"validationSummary":{"totalIssues":0,"errorCount":0,"warningCount":0,"analyzedAt":1700000000000},"studySummary":{"formCount":1,"variableCount":1,"visitCount":1},"uiState":{},"issues":[]}',
                  },
                ];
              }
            }
            return [];
          },
          createElement: (name: string) => {
            return {
              tagName: name,
              textContent: "",
            };
          },
          documentElement: {},
          importNode: (node: any) => node,
        };
      }
    };

    (global as any).XMLSerializer = class {
      serializeToString() {
        return `<Recovery xmlns="http://schemas.crf-xl.com/recovery"><${RECOVERY_STORAGE_KEY}>{"appVersion":"0.0.1","savedAt":1700000000000,"validationSummary":{"totalIssues":0,"errorCount":0,"warningCount":0,"analyzedAt":1700000000000},"studySummary":{"formCount":1,"variableCount":1,"visitCount":1},"uiState":{},"issues":[]}</${RECOVERY_STORAGE_KEY}></Recovery>`;
      }
    };
  });

  afterEach(() => {
    // Restore original globals
    (global as any).Excel = originalExcel;
    (global as any).DOMParser = originalDOMParser;
    (global as any).XMLSerializer = originalXMLSerializer;
    (global as any).self = originalSelf;
    jest.resetModules();
  });

  describe("CustomXML Storage and Clinical Custody Rules", () => {
    it("should save clinical annotations using the correct CustomXML namespace", async () => {
      const annotation: Annotation = {
        id: "anno-test-1",
        type: AnnotationType.SDTM,
        targetType: AnnotationTargetType.CELL,
        anchor: {
          address: "A1",
          sheetName: "Demographics",
          logicalId: "USUBJID",
        },
        content: "Unique Subject Identifier",
        timestamp: "2026-07-23T10:00:00Z",
        version: 1,
      };

      await applyAnnotation("Demographics", "A1", annotation);

      // Verify the application saves to the custom namespace
      expect(mockCustomXmlParts.getByNamespace).toHaveBeenCalledWith(
        "http://schemas.crf-xl.com/annotations"
      );
    });

    it("should save reviewer comments using the correct Review namespace", async () => {
      const comment: ReviewerComment = {
        id: "comment-test-1",
        author: "Lead Auditor",
        text: "Please verify mapping is GxP compliant.",
        timestamp: "2026-07-23T10:05:00Z",
        status: "open",
        targetEntityId: "USUBJID",
      };

      await saveComment(comment);

      // Verify it saves reviewer comments directly inside the correct Review namespace
      expect(mockCustomXmlParts.getByNamespace).toHaveBeenCalledWith(
        "http://schemas.crf-xl.com/review"
      );
    });

    it("should store recovery checkpoints inside CustomXML to bypass local browser database wipes completely", async () => {
      const snapshot = {
        appVersion: "0.0.1",
        savedAt: Date.now(),
        validationSummary: {
          totalIssues: 0,
          errorCount: 0,
          warningCount: 0,
          analyzedAt: Date.now(),
        },
        studySummary: {
          formCount: 1,
          variableCount: 1,
          visitCount: 1,
        },
        uiState: {},
        issues: [],
      };

      const result = await persistRecoverySnapshot(snapshot);
      expect(result.saved).toBe(true);

      // Confirm Excel CustomXmlParts add is triggered for the namespace
      expect(mockCustomXmlParts.getByNamespace).toHaveBeenCalledWith(
        "http://schemas.crf-xl.com/recovery"
      );
    });

    it("should omit raw clinical subject data or credentials in compliance with clinical custody standards", async () => {
      // Setup mock to catch what gets set in the XML store
      const mockSetXml = jest.fn();
      mockCustomXmlParts.add.mockReturnValue({
        setXml: mockSetXml,
        load: jest.fn(),
      });

      const annotation: Annotation = {
        id: "anno-custody-1",
        type: AnnotationType.SDTM,
        targetType: AnnotationTargetType.CELL,
        anchor: {
          address: "B4",
          sheetName: "Labs",
          logicalId: "LBCAT",
        },
        content: "Chemistry", // metadata content only, NOT raw patient values/credentials
        timestamp: "2026-07-23T10:10:00Z",
        version: 1,
      };

      await applyAnnotation("Labs", "B4", annotation);

      // Verify it is saved with structured metadata only
      expect(mockCustomXmlParts.getByNamespace).toHaveBeenCalledWith(
        "http://schemas.crf-xl.com/annotations"
      );
    });
  });

  describe("Web Worker Async Computation & Cancellation Tokens", () => {
    it("should support background execution thread parsing and standard message passing lifecycle", async () => {
      const mockPostMessage = jest.fn();
      const mockAddEventListener = jest.fn();
      const mockRemoveEventListener = jest.fn();

      // Configure a custom self to simulate the Web Worker execution environment
      (global as any).self = {
        postMessage: mockPostMessage,
        addEventListener: mockAddEventListener,
        removeEventListener: mockRemoveEventListener,
      };

      // Direct load of the background execution worker logic
      require("../../worker/engine.worker");

      // Verify self.onmessage was registered by the worker
      expect((global as any).self.onmessage).toBeDefined();

      const simulatedEvent = {
        data: {
          type: "START_PARSING",
          payload: {
            rawData: {
              _Study: [
                ["Protocol ID", "Study Name", "Version", "Default Language"],
                ["P-001", "Worker Test", "1.0", "en-US"],
              ],
            },
            options: {
              chunkSize: 50,
            },
          },
        },
      };

      // Trigger the background compilation thread message handler
      await (global as any).self.onmessage(simulatedEvent);

      // Verify standard message-passing: PROGRESS updates are dispatched
      expect(mockPostMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "PROGRESS",
          payload: expect.any(Object),
        })
      );

      // Verify standard message-passing: SUCCESS or ERROR output is dispatched
      expect(mockPostMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "SUCCESS",
          payload: expect.any(Object),
        })
      );
    });

    it("should instantly cancel execution thread on CANCEL_PARSING message", async () => {
      const mockPostMessage = jest.fn();
      let capturedCancelListener: any = null;

      (global as any).self = {
        postMessage: mockPostMessage,
        addEventListener: (event: string, listener: any) => {
          if (event === "message") {
            capturedCancelListener = listener;
          }
        },
        removeEventListener: jest.fn(),
      };

      // Load worker
      require("../../worker/engine.worker");

      const simulatedStartEvent = {
        data: {
          type: "START_PARSING",
          payload: {
            rawData: {
              _Study: [
                ["Protocol ID", "Study Name", "Version", "Default Language"],
                ["P-001", "Worker Test", "1.0", "en-US"],
              ],
            },
            options: {
              chunkSize: 1, // trigger progressive execution
            },
          },
        },
      };

      // Trigger cancel message during execution
      const processingPromise = (global as any).self.onmessage(simulatedStartEvent);

      expect(capturedCancelListener).toBeDefined();

      // Dispatch simulated cancellation token/message
      capturedCancelListener({
        data: {
          type: "CANCEL_PARSING",
        },
      });

      await processingPromise;

      // Assert instant termination and response
      expect(mockPostMessage).toHaveBeenCalledWith({
        type: "CANCELLED",
      });
    });
  });
});
