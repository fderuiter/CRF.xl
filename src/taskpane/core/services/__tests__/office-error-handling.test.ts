import {
  OFFICE_ERROR_MESSAGES,
  classifyOfficeError,
  createOfficeErrorPresentation,
} from "../office-error-handling";

describe("office-error-handling", () => {
  it("classifies each required Office.js error class", () => {
    expect(classifyOfficeError({ code: "Busy", message: "User is in cell edit mode" })).toBe(
      "excelBusy"
    );
    expect(classifyOfficeError({ code: "InvalidObjectPath", message: "Workbook not ready" })).toBe(
      "workbookNotReady"
    );
    expect(classifyOfficeError({ code: "ItemNotFound", message: "Worksheet not found" })).toBe(
      "sheetOrRangeMissing"
    );
    expect(classifyOfficeError({ code: "AccessDenied", message: "Sheet is protected" })).toBe(
      "permissionFailure"
    );
    expect(classifyOfficeError({ code: "GeneralException", message: "context.sync failed" })).toBe(
      "contextSyncFailure"
    );
    expect(classifyOfficeError({ code: "Unsupported", message: "Feature not supported" })).toBe(
      "unsupportedHost"
    );
    expect(classifyOfficeError({ code: "NetworkError", message: "Failed to fetch" })).toBe(
      "networkFailure"
    );
  });

  it("returns plain-language sheet missing message with extracted name", () => {
    const presentation = createOfficeErrorPresentation({
      code: "ItemNotFound",
      message: "Worksheet 'DEMO' not found",
    });

    expect(presentation.message).toContain("Required sheet or range 'DEMO' is missing.");
    expect(presentation.recoveryAction).toBe(
      OFFICE_ERROR_MESSAGES.sheetOrRangeMissing.recoveryAction
    );
    expect(presentation.diagnosticCode).toBe("OFFICE_SHEET_OR_RANGE_MISSING:ItemNotFound");
  });

  it("falls back to unknownOfficeError for unmatched errors", () => {
    const presentation = createOfficeErrorPresentation({ code: "X", message: "Unexpected xyz" });
    expect(presentation.errorClass).toBe("unknownOfficeError");
    expect(presentation.message).toBe(OFFICE_ERROR_MESSAGES.unknownOfficeError.message);
  });
});
