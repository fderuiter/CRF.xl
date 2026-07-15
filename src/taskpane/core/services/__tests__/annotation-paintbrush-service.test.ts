/**
 * @issue #84
 */
import { AnnotationType } from "../../types";
import { annotationPaintbrushService } from "../annotation-paintbrush-service";

/* global jest, describe, it, expect, beforeEach */

describe("AnnotationPaintbrushService", () => {
  let mockContext: any;
  let mockSheet: any;

  beforeEach(() => {
    mockSheet = {
      getRangeByIndexes: jest.fn().mockReturnValue({
        load: jest.fn(),
        values: [["OID1"]],
        context: { sync: jest.fn() },
      }),
      getRange: jest.fn().mockReturnValue({
        load: jest.fn(),
        address: "A1",
        rowIndex: 0,
        columnIndex: 0,
        context: { sync: jest.fn() },
        getMergedAreasOrNullObject: jest.fn().mockReturnValue({
          load: jest.fn(),
          isNullObject: true,
        }),
      }),
      comments: {
        add: jest.fn().mockReturnValue({ load: jest.fn(), id: "comment-new" }),
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
          getActiveWorksheet: jest.fn().mockReturnValue(mockSheet),
          load: jest.fn(),
          items: [mockSheet],
        },
      },
      sync: jest.fn(),
    };

    (global as any).Excel = {
      run: (callback: any) => {
        const { createSafeMock } = require("../../utils/test-proxy");
        return callback(createSafeMock(mockContext));
      },
    };

    (global as any).DOMParser = class {
      parseFromString() {
        return {
          getElementsByTagName: (name: string) => {
            if (name === "Annotations")
              return [{ appendChild: jest.fn(), replaceChild: jest.fn() }];
            if (name === "Annotation") return [];
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

    annotationPaintbrushService.setEnabled(false);
    annotationPaintbrushService.clearTargets();
  });

  it("should accumulate targets in paintbrush mode", async () => {
    annotationPaintbrushService.setEnabled(true);
    await annotationPaintbrushService.toggleTarget("Sheet1", "A1");
    await annotationPaintbrushService.toggleTarget("Sheet1", "B2");

    const state = annotationPaintbrushService.getState();
    expect(state.pendingTargets.length).toBe(2);
    expect(state.pendingTargets[0].address).toBe("A1");
    expect(state.pendingTargets[1].address).toBe("B2");
  });

  it("should toggle (remove) existing target", async () => {
    annotationPaintbrushService.setEnabled(true);
    await annotationPaintbrushService.toggleTarget("Sheet1", "A1");
    await annotationPaintbrushService.toggleTarget("Sheet1", "A1");

    const state = annotationPaintbrushService.getState();
    expect(state.pendingTargets.length).toBe(0);
  });

  it("should execute bulk apply and clear targets", async () => {
    annotationPaintbrushService.setEnabled(true);
    annotationPaintbrushService.setType(AnnotationType.SDTM);
    annotationPaintbrushService.setContent("Bulk content");
    await annotationPaintbrushService.toggleTarget("Sheet1", "A1");
    await annotationPaintbrushService.toggleTarget("Sheet1", "B2");

    await annotationPaintbrushService.executeBulkApply();

    const state = annotationPaintbrushService.getState();
    expect(state.pendingTargets.length).toBe(0);
    expect(state.history.length).toBe(1);
  });

  it("should block bulk apply if targets have errors", async () => {
    annotationPaintbrushService.setEnabled(true);

    // Mock a blocked target (e.g. protected range)
    mockSheet.getRange.mockReturnValue({
      load: jest.fn(),
      address: "A1",
      context: { sync: jest.fn() },
      worksheet: { protection: { protected: true } },
      format: { protection: { locked: true } },
      getMergedAreasOrNullObject: jest
        .fn()
        .mockReturnValue({ isNullObject: true, load: jest.fn() }),
    });

    await annotationPaintbrushService.toggleTarget("Sheet1", "A1");

    await expect(annotationPaintbrushService.executeBulkApply()).rejects.toThrow(
      "blocked by validation errors"
    );
  });
});
