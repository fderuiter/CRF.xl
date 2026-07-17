/**
 * @issue #28
 */
import {
  AdamDatasetClass,
  AdamDatasetMetadata,
  SdtmDatasetClass,
  SdtmDatasetMetadata,
} from "../../core/types";
import { ClinicalValidationPipeline } from "../../core/validators/clinical-pipeline";

export interface DatasetDraft<T> {
  id: string;
  metadata: T;
  provenance: "Imported" | "Draft";
  readOnly: boolean;
}

type SubmissionMetadataValidationErrors = Record<string, string>;

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
  const pipeline = new ClinicalValidationPipeline();
  const result = pipeline.validateDataset(metadata, "SDTM");
  result.issues.forEach((issue) => {
    if (issue.message.includes("SDTM Domain is required")) errors.domain = issue.message;
    else if (issue.message.includes("Label is required")) errors.label = issue.message;
    else if (issue.message.includes("Structure is required")) errors.structure = issue.message;
    else if (issue.message.includes("Class is required")) errors.class = issue.message;
    else if (issue.message.includes("naming conventions")) errors.domain = issue.message;
  });
  return errors;
}

export function validateAdamDatasetMetadata(
  metadata: AdamDatasetMetadata
): SubmissionMetadataValidationErrors {
  const errors: SubmissionMetadataValidationErrors = {};
  const pipeline = new ClinicalValidationPipeline();
  const result = pipeline.validateDataset(metadata, "ADaM");
  result.issues.forEach((issue) => {
    if (issue.message.includes("ADaM Dataset is required")) errors.dataset = issue.message;
    else if (issue.message.includes("Label is required")) errors.label = issue.message;
    else if (issue.message.includes("Structure is required")) errors.structure = issue.message;
    else if (issue.message.includes("Class is required")) errors.class = issue.message;
  });
  return errors;
}
