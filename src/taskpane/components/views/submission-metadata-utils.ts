/**
 * @issue #28
 */
import {
  AdamDatasetClass,
  AdamDatasetMetadata,
  SdtmDatasetClass,
  SdtmDatasetMetadata,
} from "../../core/types";

export interface DatasetDraft<T> {
  id: string;
  metadata: T;
  provenance: "Imported" | "Draft";
  readOnly: boolean;
}

export type SubmissionMetadataValidationErrors = Record<string, string>;

function hasText(value: string | undefined): boolean {
  return !!value && value.trim().length > 0;
}

export function createSdtmDatasetDrafts(
  datasets: SdtmDatasetMetadata[] | undefined
): DatasetDraft<SdtmDatasetMetadata>[] {
  return (datasets || []).map((metadata, index) => ({
    id: `sdtm-${index}-${metadata.domain || "dataset"}`,
    metadata: { ...metadata },
    provenance: "Imported",
    readOnly: true,
  }));
}

export function createAdamDatasetDrafts(
  datasets: AdamDatasetMetadata[] | undefined
): DatasetDraft<AdamDatasetMetadata>[] {
  return (datasets || []).map((metadata, index) => ({
    id: `adam-${index}-${metadata.dataset || "dataset"}`,
    metadata: { ...metadata },
    provenance: "Imported",
    readOnly: true,
  }));
}

export function createEmptySdtmDatasetMetadata(): SdtmDatasetMetadata {
  return {
    domain: "",
    label: "",
    class: SdtmDatasetClass.SPECIAL_PURPOSE,
    structure: "",
  };
}

export function createEmptyAdamDatasetMetadata(): AdamDatasetMetadata {
  return {
    dataset: "",
    label: "",
    class: AdamDatasetClass.ADAM_BASIC_DATA_STRUCTURE,
    structure: "",
  };
}

export function validateSdtmDatasetMetadata(
  metadata: SdtmDatasetMetadata
): SubmissionMetadataValidationErrors {
  const errors: SubmissionMetadataValidationErrors = {};
  if (!hasText(metadata.domain)) errors.domain = "SDTM Domain is required.";
  if (!hasText(metadata.label)) errors.label = "Label is required.";
  if (!hasText(metadata.structure)) errors.structure = "Structure is required.";
  return errors;
}

export function validateAdamDatasetMetadata(
  metadata: AdamDatasetMetadata
): SubmissionMetadataValidationErrors {
  const errors: SubmissionMetadataValidationErrors = {};
  if (!hasText(metadata.dataset)) errors.dataset = "ADaM Dataset is required.";
  if (!hasText(metadata.label)) errors.label = "Label is required.";
  if (!hasText(metadata.structure)) errors.structure = "Structure is required.";
  return errors;
}
