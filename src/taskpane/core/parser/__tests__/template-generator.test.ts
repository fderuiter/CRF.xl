/**
 * @issue #28
 */
/* eslint-disable no-undef */
import { CRF_VARIABLE_TYPE_OPTIONS } from "../form-element-utils";
import { getSheetProtectionConfigs } from "../template-generator";

describe("Sheet protection configuration", () => {
  it("locks headers and leaves editable input ranges on _Forms", () => {
    const formsConfig = getSheetProtectionConfigs().find((config) => config.sheetName === "_Forms");

    expect(formsConfig).toBeDefined();
    expect(formsConfig?.protectionArea).toEqual("A1:XFD1000");
    expect(formsConfig?.lockedRanges).toEqual(["A1:D1"]);
    expect(formsConfig?.editableRanges).toEqual(["A2:D1000"]);
  });

  it("locks header and formula column while allowing schedule entry columns", () => {
    const scheduleConfig = getSheetProtectionConfigs().find(
      (config) => config.sheetName === "_Schedule"
    );

    expect(scheduleConfig).toBeDefined();
    expect(scheduleConfig?.protectionArea).toEqual("A1:XFD1000");
    expect(scheduleConfig?.lockedRanges).toEqual(["A1:XFD1", "A2:A1000"]);
    expect(scheduleConfig?.editableRanges).toEqual(["B2:XFD1000"]);
  });

  it("includes display-only form blocks in the Variable Type dropdown list", () => {
    expect(CRF_VARIABLE_TYPE_OPTIONS).toEqual(
      expect.arrayContaining(["Heading", "Instruction", "Separator"])
    );
  });
});
