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
  sdtmMappingSchema,
  codelistItemSchema,
  codelistSchema,
  adamMappingSchema,
  sdtmDatasetMetadataSchema,
  adamDatasetMetadataSchema,
  submissionMetadataSchema,
} from "./schemas";
export type SdtmMapping = z.infer<typeof sdtmMappingSchema>;
export type CodelistItem = z.infer<typeof codelistItemSchema>;
export type Codelist = z.infer<typeof codelistSchema>;
export type AdamMapping = z.infer<typeof adamMappingSchema>;
export type SdtmDatasetMetadata = z.infer<typeof sdtmDatasetMetadataSchema>;
export type AdamDatasetMetadata = z.infer<typeof adamDatasetMetadataSchema>;
export type SubmissionMetadata = z.infer<typeof submissionMetadataSchema>;
