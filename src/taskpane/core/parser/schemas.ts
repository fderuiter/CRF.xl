import { z } from "zod";

const TranslatedTextSchema = z.record(z.string(), z.string());

const SubmissionStandardSchema = z.object({
  standardOid: z.string(),
  name: z.string(),
  version: z.string(),
  status: z.enum(["Draft", "Final"]).optional(),
});

const SubmissionCommentSchema = z.object({
  commentOid: z.string(),
  text: z.string(),
  translatedText: TranslatedTextSchema.optional(),
});

const SdtmMappingSchema = z.object({
  domain: z.string(),
  variable: z.string(),
  nciVariableCode: z.string().optional(),
  sasFieldName: z.string().optional(),
  sasLabel: z.string().optional(),
  sasDatasetName: z.string().optional(),
  core: z.string().optional(),
  role: z.string().optional(),
  origin: z.string().optional(),
  pages: z.string().optional(),
  commentOid: z.string().optional(),
  mandatory: z.boolean().optional(),
  isVlm: z.boolean().optional(),
});

const AdamMappingSchema = z.object({
  dataset: z.string(),
  variable: z.string(),
  nciVariableCode: z.string().optional(),
  sasFieldName: z.string().optional(),
  sasLabel: z.string().optional(),
  core: z.string().optional(),
  role: z.string().optional(),
  type: z.string().optional(),
  length: z.number().optional(),
  significantDigits: z.number().optional(),
  origin: z.string().optional(),
  commentOid: z.string().optional(),
  predecessor: z.string().optional(),
  derivationOid: z.string().optional(),
  isVlm: z.boolean().optional(),
});

const SdtmVariableMetadataSchema = z.object({
  vlmOid: z.string(),
  parentItemOid: z.string(),
  whereClause: z.string().optional(),
  sdtmMapping: SdtmMappingSchema,
});

const AdamVariableMetadataSchema = z.object({
  vlmOid: z.string(),
  parentItemOid: z.string(),
  whereClause: z.string().optional(),
  adamMapping: AdamMappingSchema,
});

const SdtmDatasetMetadataSchema = z.object({
  domain: z.string(),
  label: z.string(),
  class: z.string(),
  structure: z.string(),
  keyVariables: z.array(z.string()).optional(),
  repeating: z.boolean().optional(),
  description: z.string().optional(),
  standardOid: z.string().optional(),
  archivedFlag: z.boolean().optional(),
  leafHref: z.string().optional(),
  isReferenceData: z.boolean().optional(),
  commentOid: z.string().optional(),
  hasNoData: z.boolean().optional(),
});

const AdamDatasetMetadataSchema = z.object({
  dataset: z.string(),
  label: z.string(),
  class: z.string(),
  structure: z.string(),
  keyVariables: z.array(z.string()).optional(),
  repeating: z.boolean().optional(),
  description: z.string().optional(),
  standardOid: z.string().optional(),
  archivedFlag: z.boolean().optional(),
  leafHref: z.string().optional(),
  purpose: z.string().optional(),
  analysisType: z.string().optional(),
  commentOid: z.string().optional(),
  hasNoData: z.boolean().optional(),
});

const SubmissionDerivationSchema = z.object({
  derivationId: z.string(),
  label: z.string(),
  description: z.string(),
  expression: z.string().optional(),
  inputVariables: z.array(z.string()).optional(),
  methodOid: z.string().optional(),
  outputVariables: z.array(z.string()).optional(),
  sourceText: z.string().optional(),
  type: z.enum(["Computation", "Imputation", "Transpose", "Other"]).optional(),
});

const SubmissionMetadataSchema = z.object({
  sdtmDatasets: z.array(SdtmDatasetMetadataSchema).optional(),
  adamDatasets: z.array(AdamDatasetMetadataSchema).optional(),
  sdtmDerivations: z.array(SubmissionDerivationSchema).optional(),
  adamDerivations: z.array(SubmissionDerivationSchema).optional(),
  sdtmVariableMetadata: z.array(SdtmVariableMetadataSchema).optional(),
  adamVariableMetadata: z.array(AdamVariableMetadataSchema).optional(),
  comments: z.array(SubmissionCommentSchema).optional(),
  standards: z.array(SubmissionStandardSchema).optional(),
});

const StudyMetadataSchema = z.object({
  protocolId: z.string(),
  studyName: z.string(),
  phase: z.string().optional(),
  sponsor: z.string().optional(),
  version: z.string(),
  defaultLanguage: z.string(),
  supportedLanguages: z.array(z.string()).optional(),
  dateGenerated: z.string().optional(),
  dictionaryVersions: z.record(z.string(), z.string()).optional(),
  customProperties: z.record(z.string(), z.unknown()).optional(),
});

import { studyEventSchema, crfFormSchema } from "../types/schemas";

export const StudyDesignSchema = z.object({
  metadata: StudyMetadataSchema,
  events: z.array(studyEventSchema),
  forms: z.record(z.string(), crfFormSchema),
  codelists: z.record(z.string(), z.unknown()),
  rules: z.array(z.unknown()).optional(),
  methods: z.record(z.string(), z.unknown()).optional(),
  submissionMetadata: SubmissionMetadataSchema.optional(),
  crossFormDependencies: z.array(z.unknown()).optional(),
});
