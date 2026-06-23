/**
 * @issue #165
 */
import { bindingService } from "../binding-service";

/* global jest, describe, it, expect, beforeEach, afterEach */

describe("BindingService", () => {
  let mockContext: any;

  beforeEach(() => {
    jest.useFakeTimers();
    mockContext = {
      workbook: {
        worksheets: {
          onActivated: { add: jest.fn(() => ({ remove: jest.fn() })) },
          getActiveWorksheet: jest.fn(() => ({
            name: "Sheet1",
            load: jest.fn(),
          })),
        },
        onSelectionChanged: { add: jest.fn(() => ({ remove: jest.fn() })) },
        getSelectedRange: jest.fn(() => ({
          address: "A1",
          values: [["Value1"]],
          rowIndex: 0,
          columnIndex: 0,
          rowCount: 1,
          columnCount: 1,
          worksheet: {
            name: "Sheet1",
            load: jest.fn(),
          },
          load: jest.fn(),
          getRangeByIndexes: jest.fn(() => ({
            load: jest.fn(),
            values: [["Header"]],
          })),
        })),
      },
      sync: jest.fn().mockResolvedValue(undefined),
    };

    (global as any).Excel = {
      run: jest.fn((callback) => callback(mockContext)),
      DeleteShiftDirection: { up: "Up" },
    };
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it("should initialize listeners", async () => {
    await bindingService.initialize();
    expect(mockContext.workbook.worksheets.onActivated.add).toHaveBeenCalled();
    expect(mockContext.workbook.onSelectionChanged.add).toHaveBeenCalled();
  });

  it("should notify listeners on selection change with debouncing", async () => {
    const listener = jest.fn();
    // Subscribe without immediate trigger to test debounce
    bindingService.subscribe(listener, false);

    // Force context change detection
    (bindingService as any).currentContext = { sheetName: "Other" };

    // Trigger selection change
    (bindingService as any).handleSelectionChanged();

    // Should not be called immediately due to debounce
    expect(listener).not.toHaveBeenCalled();

    jest.runAllTimers();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(listener).toHaveBeenCalled();
  });

  it("should support origin tagging for internal operations", async () => {
    const listener = jest.fn();
    bindingService.subscribe(listener);

    await bindingService.performInternalOperation(async (_ctx) => {
      // Mocking some Excel action
      return "done";
    });

    // Directly call the handler which would normally trigger on Excel selection change
    (bindingService as any).handleSelectionChanged();

    jest.runAllTimers();
    await Promise.resolve();

    // Listener should NOT be called because it was an internal operation
    // Note: It might have been called once during initial subscription or performInternalOperation's sync,
    // but the specific handleSelectionChanged call during internal op should be ignored.

    // In our implementation, handleSelectionChanged checks isInternalOperation and returns early.
    expect(listener).toHaveBeenCalledTimes(1); // Only the initial call from subscribe
  });

  it("should identify field name from header row", async () => {
    const listener = jest.fn();
    bindingService.subscribe(listener, false);

    const mockHeaderRange = {
      load: jest.fn(),
      values: [["Codelist ID"]],
    };

    mockContext.workbook.getSelectedRange.mockReturnValue({
      address: "A2",
      values: [["VAL1"]],
      rowIndex: 1,
      columnIndex: 0,
      rowCount: 1,
      columnCount: 1,
      worksheet: {
        name: "CRF1",
        load: jest.fn(),
        getRangeByIndexes: jest.fn(() => mockHeaderRange),
      },
      load: jest.fn(),
    });
    mockContext.workbook.worksheets.getActiveWorksheet.mockReturnValue({
      name: "CRF1",
      load: jest.fn(),
      getRangeByIndexes: jest.fn(() => mockHeaderRange),
    });

    (bindingService as any).currentContext = { sheetName: "Other" };
    (bindingService as any).handleSelectionChanged();
    jest.runAllTimers();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        fieldName: "Codelist ID",
      })
    );
  });
});
