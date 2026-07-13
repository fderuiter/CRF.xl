/**
 * @issue #347
 */

import {
  StudyDesign,
  SubmissionMetadata,
  SdtmDatasetMetadata,
  AdamDatasetMetadata,
  SdtmMapping,
  AdamMapping,
} from "../types";

export interface ClinicalValidationIssue {
  level: "Error" | "Warning";
  message: string;
  path?: string;
  datasetName?: string;
  variableName?: string;
}

export interface ClinicalValidationResult {
  issues: ClinicalValidationIssue[];
  isValid: boolean;
}

export class ClinicalValidationPipeline {
  private issues: ClinicalValidationIssue[] = [];

  public validate(study: StudyDesign, isExport: boolean = false): ClinicalValidationResult {
    this.issues = [];

    if (study.submissionMetadata) {
      this.validateSubmissionMetadata(study.submissionMetadata, isExport);
    }

    this.validateVariables(study, isExport);

    return {
      issues: this.issues,
      isValid: !this.issues.some((i) => i.level === "Error"),
    };
  }

  public validateDataset(
    dataset: SdtmDatasetMetadata | AdamDatasetMetadata,
    type: "SDTM" | "ADaM",
    isExport: boolean = false
  ): ClinicalValidationResult {
    this.issues = [];

    if (type === "SDTM") {
      this.validateSdtmDataset(dataset as SdtmDatasetMetadata, isExport);
    } else {
      this.validateAdamDataset(dataset as AdamDatasetMetadata, isExport);
    }

    return {
      issues: this.issues,
      isValid: !this.issues.some((i) => i.level === "Error"),
    };
  }

  public validateVariable(
    mapping: SdtmMapping | AdamMapping,
    type: "SDTM" | "ADaM",
    isExport: boolean = false
  ): ClinicalValidationResult {
    this.issues = [];

    if (type === "SDTM") {
      this.validateSdtmVariable(mapping as SdtmMapping, isExport);
    } else {
      this.validateAdamVariable(mapping as AdamMapping, isExport);
    }

    return {
      issues: this.issues,
      isValid: !this.issues.some((i) => i.level === "Error"),
    };
  }

  private validateSubmissionMetadata(metadata: SubmissionMetadata, isExport: boolean) {
    if (metadata.sdtmDatasets) {
      metadata.sdtmDatasets.forEach((ds) => this.validateSdtmDataset(ds, isExport));
    }
    if (metadata.adamDatasets) {
      metadata.adamDatasets.forEach((ds) => this.validateAdamDataset(ds, isExport));
    }
  }

  private validateSdtmDataset(dataset: SdtmDatasetMetadata, isExport: boolean) {
    const dsName = dataset.domain || dataset.label;
    if (!dataset.domain || dataset.domain.trim().length === 0) {
      this.issues.push({
        level: "Error",
        message: "SDTM Domain is required.",
        datasetName: dsName,
      });
    }
    if (!dataset.label || dataset.label.trim().length === 0) {
      this.issues.push({ level: "Error", message: "Label is required.", datasetName: dsName });
    }
    if (!dataset.structure || dataset.structure.trim().length === 0) {
      this.issues.push({ level: "Error", message: "Structure is required.", datasetName: dsName });
    }
    if (!dataset.class) {
      this.issues.push({ level: "Error", message: "Class is required.", datasetName: dsName });
    }
    if (isExport && !dataset.keyVariables?.length) {
      this.issues.push({
        level: "Warning",
        message: "Key variables should be defined for batch export.",
        datasetName: dsName,
      });
    }

    if (
      dataset.domain &&
      (dataset.domain.length > 8 || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(dataset.domain))
    ) {
      this.issues.push({
        level: "Warning",
        message: "SDTM Domain might not follow SAS dataset naming conventions.",
        datasetName: dsName,
      });
    }
  }

  private validateAdamDataset(dataset: AdamDatasetMetadata, isExport: boolean) {
    const dsName = dataset.dataset || dataset.label;
    if (!dataset.dataset || dataset.dataset.trim().length === 0) {
      this.issues.push({
        level: "Error",
        message: "ADaM Dataset is required.",
        datasetName: dsName,
      });
    }
    if (!dataset.label || dataset.label.trim().length === 0) {
      this.issues.push({ level: "Error", message: "Label is required.", datasetName: dsName });
    }
    if (!dataset.structure || dataset.structure.trim().length === 0) {
      this.issues.push({ level: "Error", message: "Structure is required.", datasetName: dsName });
    }
    if (!dataset.class) {
      this.issues.push({ level: "Error", message: "Class is required.", datasetName: dsName });
    }
    if (isExport && !dataset.keyVariables?.length) {
      this.issues.push({
        level: "Warning",
        message: "Key variables should be defined for batch export.",
        datasetName: dsName,
      });
    }
  }

  private validateVariables(study: StudyDesign, isExport: boolean) {
    if (!study.forms) return;
    Object.values(study.forms).forEach((form) => {
      form.itemGroups?.forEach((group) => {
        group.items?.forEach((item) => {
          if (item.nodeType === "display") return;
          if (item.sdtmMapping) {
            const result = this.validateVariable(item.sdtmMapping, "SDTM", isExport);
            result.issues.forEach((issue) => {
              this.issues.push({
                ...issue,
                path: `${form.formName} > ${item.name}`,
              });
            });
          }
          if (item.adamMapping) {
            const result = this.validateVariable(item.adamMapping, "ADaM", isExport);
            result.issues.forEach((issue) => {
              this.issues.push({
                ...issue,
                path: `${form.formName} > ${item.name}`,
              });
            });
          }
        });
      });
    });
  }

  public validateSdtmVariable(mapping: SdtmMapping, isExport: boolean) {
    const varName = mapping.variable || mapping.sasFieldName;
    const hasDomain = !!mapping.domain && !!mapping.domain.trim();
    const hasVar = !!mapping.variable && !!mapping.variable.trim();

    if (hasDomain || hasVar) {
      if (!hasDomain) {
        this.issues.push({
          level: "Error",
          message: `SDTM variable '${mapping.variable}' is mapped but SDTM domain is missing.`,
          variableName: varName,
        });
      } else if (!hasVar) {
        this.issues.push({
          level: "Error",
          message: `SDTM domain '${mapping.domain}' is mapped but SDTM variable name is missing.`,
          variableName: varName,
        });
      }

      if (isExport && hasDomain && hasVar) {
        if (!mapping.core) {
          this.issues.push({
            level: "Error",
            message: `SDTM variable '${mapping.domain}.${mapping.variable}' is missing Core requiredness designation.`,
            variableName: varName,
          });
        }
        if (!mapping.role) {
          this.issues.push({
            level: "Error",
            message: `SDTM variable '${mapping.domain}.${mapping.variable}' is missing Role designation.`,
            variableName: varName,
          });
        }
        if (!mapping.sasFieldName) {
          this.issues.push({
            level: "Error",
            message: `SDTM variable '${mapping.domain}.${mapping.variable}' is missing SAS Field Name.`,
            variableName: varName,
          });
        }
        if (!mapping.sasLabel) {
          this.issues.push({
            level: "Error",
            message: `SDTM variable '${mapping.domain}.${mapping.variable}' is missing SAS Label.`,
            variableName: varName,
          });
        }
      }
    }
  }

  public validateAdamVariable(mapping: AdamMapping, isExport: boolean) {
    const varName = mapping.variable || mapping.sasFieldName;
    const hasDataset = !!mapping.dataset && !!mapping.dataset.trim();
    const hasVar = !!mapping.variable && !!mapping.variable.trim();

    if (hasDataset || hasVar) {
      if (!hasDataset) {
        this.issues.push({
          level: "Error",
          message: `ADaM variable '${mapping.variable}' is mapped but ADaM dataset is missing.`,
          variableName: varName,
        });
      } else if (!hasVar) {
        this.issues.push({
          level: "Error",
          message: `ADaM dataset '${mapping.dataset}' is mapped but ADaM variable name is missing.`,
          variableName: varName,
        });
      }

      if (isExport && hasDataset && hasVar) {
        if (!mapping.core) {
          this.issues.push({
            level: "Error",
            message: `ADaM variable '${mapping.dataset}.${mapping.variable}' is missing Core requiredness designation.`,
            variableName: varName,
          });
        }
        if (!mapping.role) {
          this.issues.push({
            level: "Error",
            message: `ADaM variable '${mapping.dataset}.${mapping.variable}' is missing Role designation.`,
            variableName: varName,
          });
        }
        if (!mapping.sasFieldName) {
          this.issues.push({
            level: "Error",
            message: `ADaM variable '${mapping.dataset}.${mapping.variable}' is missing SAS Field Name.`,
            variableName: varName,
          });
        }
        if (!mapping.sasLabel) {
          this.issues.push({
            level: "Error",
            message: `ADaM variable '${mapping.dataset}.${mapping.variable}' is missing SAS Label.`,
            variableName: varName,
          });
        }
      }
    }
  }
}
