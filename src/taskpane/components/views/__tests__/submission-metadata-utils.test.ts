/* global describe, expect, it */

import {
  AdamDatasetClass,
  SdtmDatasetClass,
} from "../../../core/types";
import {
  createAdamDatasetDrafts,
  createEmptyAdamDatasetMetadata,
  createEmptySdtmDatasetMetadata,
  createSdtmDatasetDrafts,
  validateAdamDatasetMetadata,
  validateSdtmDatasetMetadata,
} from "../submission-metadata-utils";

describe("submission-metadata-utils", () => {
  it("marks imported SDTM and ADaM rows as read-only with provenance", () => {
    const sdtmDrafts = createSdtmDatasetDrafts([
      {
        domain: "DM",
        label: "Demographics",
        class: SdtmDatasetClass.SPECIAL_PURPOSE,
        structure: "One record per subject",
      },
    ]);
    const adamDrafts = createAdamDatasetDrafts([
      {
        dataset: "ADSL",
        label: "Subject-Level Analysis",
        class: AdamDatasetClass.ADAM_BASIC_DATA_STRUCTURE,
        structure: "One record per subject",
      },
    ]);

    expect(sdtmDrafts[0].provenance).toBe("Imported");
    expect(sdtmDrafts[0].readOnly).toBe(true);
    expect(adamDrafts[0].provenance).toBe("Imported");
    expect(adamDrafts[0].readOnly).toBe(true);
  });

  it("validates required SDTM and ADaM metadata fields inline", () => {
    const sdtmErrors = validateSdtmDatasetMetadata({
      domain: "",
      label: "",
      class: SdtmDatasetClass.SPECIAL_PURPOSE,
      structure: "",
    });
    const adamErrors = validateAdamDatasetMetadata({
      dataset: "",
      label: "",
      class: AdamDatasetClass.ADAM_BASIC_DATA_STRUCTURE,
      structure: "",
    });

    expect(sdtmErrors).toMatchObject({
      domain: "SDTM Domain is required.",
      label: "Label is required.",
      structure: "Structure is required.",
    });
    expect(adamErrors).toMatchObject({
      dataset: "ADaM Dataset is required.",
      label: "Label is required.",
      structure: "Structure is required.",
    });
  });

  it("provides editable default metadata templates for new draft rows", () => {
    expect(createEmptySdtmDatasetMetadata()).toEqual({
      domain: "",
      label: "",
      class: SdtmDatasetClass.SPECIAL_PURPOSE,
      structure: "",
    });
    expect(createEmptyAdamDatasetMetadata()).toEqual({
      dataset: "",
      label: "",
      class: AdamDatasetClass.ADAM_BASIC_DATA_STRUCTURE,
      structure: "",
    });
  });
});
