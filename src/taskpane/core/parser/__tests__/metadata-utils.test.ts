/**
 * @issue #28
 */

import {
  DATA_ORIGIN_OPTIONS,
  normalizeDataOrigin,
  parseReferencedVariables,
} from "../metadata-utils";

describe("metadata-utils", () => {
  it("exposes the canonical variable origin vocabulary", () => {
    expect(DATA_ORIGIN_OPTIONS).toEqual([
      "Collected",
      "Derived",
      "Assigned",
      "Pre-Specified",
      "External",
      "Other",
    ]);
  });

  it("normalizes legacy origin values to the canonical vocabulary", () => {
    expect(normalizeDataOrigin("Protocol")).toBe("Pre-Specified");
    expect(normalizeDataOrigin("Investigator")).toBe("Collected");
    expect(normalizeDataOrigin("Subject")).toBe("Collected");
    expect(normalizeDataOrigin("eDT")).toBe("External");
    expect(normalizeDataOrigin("Derived")).toBe("Derived");
  });

  it("parses referenced variables into a structured list", () => {
    expect(parseReferencedVariables("WEIGHT, HEIGHT\nBMI;BSA")).toEqual([
      "WEIGHT",
      "HEIGHT",
      "BMI",
      "BSA",
    ]);
    expect(parseReferencedVariables("   ")).toBeUndefined();
  });
});
