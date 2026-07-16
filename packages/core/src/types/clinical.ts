/**
 * @issue #28
 */
/**
 * ============================================================================
 * clinical.ts
 * ============================================================================
 * CDISC mappings, dictionary typings, and external integration points.
 */

import { z } from "zod";
import {
  sensorConfigSchema,
  labConfigSchema,
  medicalCodingLinkSchema,
  sdtmMappingSchema,
  codelistItemSchema,
  codelistSchema,
  methodDefinitionSchema,
  adamMappingSchema,
  sdtmDatasetMetadataSchema,
  adamDatasetMetadataSchema,
  submissionDerivationSchema,
  submissionCommentSchema,
  submissionStandardSchema,
  sdtmVariableMetadataSchema,
  adamVariableMetadataSchema,
  submissionMetadataSchema,
} from "./schemas";

export type SensorConfig = z.infer<typeof sensorConfigSchema>;
export type LabConfig = z.infer<typeof labConfigSchema>;
export type MedicalCodingLink = z.infer<typeof medicalCodingLinkSchema>;
export type SdtmMapping = z.infer<typeof sdtmMappingSchema>;
export type CodelistItem = z.infer<typeof codelistItemSchema>;
export type Codelist = z.infer<typeof codelistSchema>;
export type MethodDefinition = z.infer<typeof methodDefinitionSchema>;
export type AdamMapping = z.infer<typeof adamMappingSchema>;
export type SdtmDatasetMetadata = z.infer<typeof sdtmDatasetMetadataSchema>;
export type AdamDatasetMetadata = z.infer<typeof adamDatasetMetadataSchema>;
export type SubmissionDerivation = z.infer<typeof submissionDerivationSchema>;

/**
 * A shared, referenceable comment entry. Dataset and variable metadata nodes
 * reference these by OID (commentOid) to avoid repeating large text blocks.
 * Recommended OID format: "CMT.<domain>.<context>" e.g. "CMT.DM.SUBJID".
 */
export type SubmissionComment = z.infer<typeof submissionCommentSchema>;

/**
 * References a CDISC standard version used in the submission.
 * Recommended OID format: "STD.<N>" e.g. "STD.1".
 */
export type SubmissionStandard = z.infer<typeof submissionStandardSchema>;

/**
 * A Value Level Metadata (VLM) row for an SDTM variable.
 * Each row describes a specific-value context (whereClause) within a
 * parent item's SDTM mapping, enabling finer-grained submission metadata.
 * Recommended OID format: "VLM.<domain>.<variable>.<context>".
 */
export type SdtmVariableMetadata = z.infer<typeof sdtmVariableMetadataSchema>;

/**
 * A Value Level Metadata (VLM) row for an ADaM variable.
 * Recommended OID format: "VLM.<dataset>.<variable>.<context>".
 */
export type AdamVariableMetadata = z.infer<typeof adamVariableMetadataSchema>;

export type SubmissionMetadata = z.infer<typeof submissionMetadataSchema>;
