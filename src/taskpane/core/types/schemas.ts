/** @issue #331 */
import { z } from "zod";
import {
  DataType, DictionaryType, DataOrigin, CollectionMethod, SdvTier, FormType, PaperLayoutFormat, GroupLayout, FormLayout, PageLayout, SignatureMeaning, EventType, SystemTriggerType,
  LabType, CodingTermType, SdtmCore, VariableOrigin, AdamCore, SdtmDatasetClass, AdamDatasetClass, DatasetPurpose, VasOrientation, AggregateFunction, RangeValueType, QuerySeverity, DateImputationRule
} from "./enums";

export const translatedTextSchema = z.record(z.string(), z.string());

export const rolePermissionsSchema = z.object({
  read: z.array(z.string()).optional(),
  write: z.array(z.string()).optional(),
  blindedRoles: z.array(z.string()).optional(),
});

export const systemTriggerSchema = z.object({
  triggerType: z.nativeEnum(SystemTriggerType),
  triggerTiming: z.enum(["OnSave", "OnSign"]),
  payloadMap: z.record(z.string(), z.string()).optional(),
});

export const dataPipeSourceSchema = z.object({
  eventOid: z.string().optional(),
  formOid: z.string().optional(),
  itemOid: z.string(),
});

// UI
export const assetConfigSchema = z.object({
  url: z.string(),
  altText: translatedTextSchema.optional(),
  mimeType: z.string().optional(),
});

export const vasConfigSchema = z.object({
  orientation: z.nativeEnum(VasOrientation),
  rangeMin: z.number(),
  rangeMax: z.number(),
  step: z.number(),
  minorTickStep: z.number().optional(),
  majorTickStep: z.number().optional(),
  leftLabel: translatedTextSchema.optional(),
  rightLabel: translatedTextSchema.optional(),
});

export const partialDateConfigSchema = z.object({
  allowPartialDD: z.boolean().optional(),
  allowPartialMMM: z.boolean().optional(),
  allowPartialYYYY: z.boolean().optional(),
  allowPartialTime: z.boolean().optional(),
  partialDDText: z.string().optional(),
  partialMMMText: z.string().optional(),
  partialYYYYText: z.string().optional(),
  partialTimeText: z.string().optional(),
  imputeDD: z.string().optional(),
  imputeMMM: z.string().optional(),
  imputeYYYY: z.string().optional(),
  imputeTime: z.string().optional(),
});

// Validation
export const derivationConfigSchema = z.object({
  expression: z.string().optional(),
  dependencyItemOids: z.array(z.string()),
  isAggregate: z.boolean().optional(),
  aggregateFunction: z.nativeEnum(AggregateFunction).optional(),
  targetGroupOid: z.string().optional(),
  targetItemOid: z.string().optional(),
});

export const missingDataConfigSchema = z.object({
  allowMissingCodes: z.boolean(),
  allowedCodes: z.array(z.string()).optional(),
});

export const rangeCheckSchema = z.object({
  comparator: z.enum(["<", "<=", ">", ">=", "==", "!="]),
  value: z.union([z.string(), z.number()]),
  valueType: z.nativeEnum(RangeValueType),
  severity: z.nativeEnum(QuerySeverity).optional(),
  errorMessage: translatedTextSchema.optional(),
});

export const itemValidationSchema = z.object({
  required: z.boolean(),
  requireIf: z.string().optional(),
  requiredErrorMessage: translatedTextSchema.optional(),
  missingDataConfig: missingDataConfigSchema.optional(),
  inputMask: z.string().optional(),
  minLength: z.number().optional(),
  maxLength: z.number().optional(),
  rangeChecks: z.array(rangeCheckSchema).optional(),
  regexPattern: z.union([z.any(), z.string()]).optional(), // RegExp or string
  regexErrorMessage: translatedTextSchema.optional(),
  allowFutureDates: z.boolean().optional(),
  partialDateConfig: partialDateConfigSchema.optional(),
  allowMultipleSelections: z.boolean().optional(),
  maxSelections: z.number().optional(),
  maxFiles: z.number().optional(),
  allowedExtensions: z.array(z.string()).optional(),
  maxFileSizeMb: z.number().optional(),
  dateImputationRule: z.nativeEnum(DateImputationRule).optional(),
});

export const editCheckSchema = z.object({
  logic: z.string(),
  severity: z.nativeEnum(QuerySeverity),
  queryMessage: translatedTextSchema,
});

// Clinical
export const clinicalVariableBaseSchema = z.object({
  variable: z.string().optional(),
  nciVariableCode: z.string().optional(),
  sasFieldName: z.string().optional(),
  sasLabel: z.string().optional(),
  role: z.string().optional(),
  origin: z.nativeEnum(VariableOrigin).optional(),
  commentOid: z.string().optional(),
  isVlm: z.boolean().optional(),
});

export const clinicalDatasetBaseSchema = z.object({
  label: z.string(),
  structure: z.string(),
  keyVariables: z.array(z.string()).optional(),
  repeating: z.boolean().optional(),
  description: z.string().optional(),
  standardOid: z.string().optional(),
  archivedFlag: z.boolean().optional(),
  leafHref: z.string().optional(),
  commentOid: z.string().optional(),
  hasNoData: z.boolean().optional(),
});

export const sensorConfigSchema = z.object({
  deviceType: z.string(),
  metricId: z.string(),
  frequency: z.string().optional(),
});

export const labConfigSchema = z.object({
  labType: z.nativeEnum(LabType),
  labTestCode: z.string(),
  nciLabCode: z.string().optional(),
});

export const medicalCodingLinkSchema = z.object({
  termType: z.nativeEnum(CodingTermType),
  linkedItemOid: z.string(),
  dictionaryLevel: z.string().optional(),
});

export const sdtmMappingSchema = clinicalVariableBaseSchema.extend({
  domain: z.string().optional(),
  sasDatasetName: z.string().optional(),
  core: z.nativeEnum(SdtmCore).optional(),
  pages: z.string().optional(),
  mandatory: z.boolean().optional(),
});

export const adamMappingSchema = clinicalVariableBaseSchema.extend({
  dataset: z.string().optional(),
  core: z.nativeEnum(AdamCore).optional(),
  type: z.string().optional(),
  length: z.number().optional(),
  significantDigits: z.number().optional(),
  predecessor: z.string().optional(),
  derivationOid: z.string().optional(),
});

export const codelistItemSchema = z.object({
  codelistId: z.string(),
  codedValue: z.string(),
  decodedText: translatedTextSchema,
  orderNumber: z.number().optional(),
  nciCode: z.string().optional(),
  specifyItemOid: z.string().optional(),
  parentCodedValue: z.string().optional(),
});

export const codelistSchema = z.object({
  codelistId: z.string(),
  codelistName: z.string(),
  dataType: z.union([z.string(), z.nativeEnum(DataType)]).optional(),
  nciCodelistCode: z.string().optional(),
  parentItemOid: z.string().optional(),
  subsetOfCodelistId: z.string().optional(),
  items: z.array(codelistItemSchema),
  customProperties: z.record(z.string(), z.any()).optional(),
});

export const methodDefinitionSchema = z.object({
  methodOid: z.string(),
  name: z.string(),
  type: z.string(),
  description: z.string().optional(),
  expression: z.string().optional(),
  referencedVariables: z.array(z.string()).optional(),
});

export const sdtmDatasetMetadataSchema = clinicalDatasetBaseSchema.extend({
  domain: z.string(),
  class: z.nativeEnum(SdtmDatasetClass),
  isReferenceData: z.boolean().optional(),
});

export const adamDatasetMetadataSchema = clinicalDatasetBaseSchema.extend({
  dataset: z.string(),
  class: z.nativeEnum(AdamDatasetClass),
  purpose: z.nativeEnum(DatasetPurpose).optional(),
  analysisType: z.string().optional(),
});

export const submissionDerivationSchema = z.object({
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

export const submissionCommentSchema = z.object({
  commentOid: z.string(),
  text: z.string(),
  translatedText: translatedTextSchema.optional(),
});

export const submissionStandardSchema = z.object({
  standardOid: z.string(),
  name: z.string(),
  version: z.string(),
  status: z.enum(["Draft", "Final"]).optional(),
});

export const sdtmVariableMetadataSchema = z.object({
  vlmOid: z.string(),
  parentItemOid: z.string(),
  whereClause: z.string().optional(),
  sdtmMapping: sdtmMappingSchema,
});

export const adamVariableMetadataSchema = z.object({
  vlmOid: z.string(),
  parentItemOid: z.string(),
  whereClause: z.string().optional(),
  adamMapping: adamMappingSchema,
});

export const submissionMetadataSchema = z.object({
  sdtmDatasets: z.array(sdtmDatasetMetadataSchema).optional(),
  adamDatasets: z.array(adamDatasetMetadataSchema).optional(),
  sdtmDerivations: z.array(submissionDerivationSchema).optional(),
  adamDerivations: z.array(submissionDerivationSchema).optional(),
  sdtmVariableMetadata: z.array(sdtmVariableMetadataSchema).optional(),
  adamVariableMetadata: z.array(adamVariableMetadataSchema).optional(),
  comments: z.array(submissionCommentSchema).optional(),
  standards: z.array(submissionStandardSchema).optional(),
});

// Hierarchy
export const crfDisplayBlockSchema = z.object({
  nodeType: z.literal("display"),
  displayType: z.enum(["heading", "instruction", "separator"]),
  content: z.string(),
  _sourceRowIndex: z.number(),
});

export const crfItemSchema = z.object({
  nodeType: z.literal("item").optional(),
  formOid: z.string(),
  groupOid: z.string().optional(),
  itemOid: z.string(),
  orderNumber: z.number().optional(),
  effectiveVersion: z.string().optional(),
  name: z.string(),
  label: translatedTextSchema,
  shortName: z.string().optional(),
  postText: translatedTextSchema.optional(),
  rightText: translatedTextSchema.optional(),
  exportTextChecked: z.string().optional(),
  exportTextUnchecked: z.string().optional(),
  dataType: z.union([z.string(), z.nativeEnum(DataType)]).optional(),
  length: z.number().optional(),
  significantDigits: z.number().optional(),
  measurementUnit: z.string().optional(),
  unitCodelistId: z.string().optional(),
  codelistId: z.string().optional(),
  codingDictionary: z.nativeEnum(DictionaryType).optional(),
  codingLink: medicalCodingLinkSchema.optional(),
  isPHI: z.boolean().optional(),
  permissions: rolePermissionsSchema.optional(),
  isLogKey: z.boolean().optional(),
  isPasswordBox: z.boolean().optional(),
  sdvTier: z.nativeEnum(SdvTier).optional(),
  requiresMedicalReview: z.boolean().optional(),
  requiresDataReview: z.boolean().optional(),
  requireChangeReason: z.boolean().optional(),
  allowInvestigatorComment: z.boolean().optional(),
  isStratificationFactor: z.boolean().optional(),
  prePopulateSource: dataPipeSourceSchema.optional(),
  derivation: derivationConfigSchema.optional(),
  isExpiration: z.boolean().optional(),
  labConfig: labConfigSchema.optional(),
  sensorConfig: sensorConfigSchema.optional(),
  origin: z.nativeEnum(DataOrigin).optional(),
  method: z.nativeEnum(CollectionMethod).optional(),
  methodOid: z.string().optional(),
  comment: z.string().optional(),
  validation: itemValidationSchema,
  sdtmMapping: sdtmMappingSchema.optional(),
  adamMapping: adamMappingSchema.optional(),
  defaultValue: z.string().optional(),
  editChecks: z.array(editCheckSchema).optional(),
  captureTimezone: z.boolean().optional(),
  timeFormat: z.enum(["12h", "24h"]).optional(),
  timePrecision: z.enum(["HH:mm", "HH:mm:ss"]).optional(),
  paperLayout: z.nativeEnum(PaperLayoutFormat).optional(),
  displayWidth: z.union([z.string(), z.number()]).optional(),
  displayLines: z.number().optional(),
  vasConfig: vasConfigSchema.optional(),
  assetConfig: assetConfigSchema.optional(),
  instructions: translatedTextSchema.optional(),
  placeholderText: translatedTextSchema.optional(),
  tooltipHelp: translatedTextSchema.optional(),
  isHidden: z.boolean().optional(),
  showIf: z.string().optional(),
  enableIf: z.string().optional(),
  customProperties: z.record(z.string(), z.any()).optional(),
});

export const crfDisplayBlockElementSchema = crfDisplayBlockSchema.extend({
  formOid: z.string().optional(),
  groupOid: z.string().optional(),
  itemOid: z.string().optional(),
  orderNumber: z.number().optional(),
  effectiveVersion: z.string().optional(),
  name: z.string().optional(),
  label: translatedTextSchema.optional(),
  shortName: z.string().optional(),
  postText: translatedTextSchema.optional(),
  rightText: translatedTextSchema.optional(),
  exportTextChecked: z.string().optional(),
  exportTextUnchecked: z.string().optional(),
  dataType: z.union([z.string(), z.nativeEnum(DataType)]).optional(),
  length: z.number().optional(),
  significantDigits: z.number().optional(),
  measurementUnit: z.string().optional(),
  unitCodelistId: z.string().optional(),
  codelistId: z.string().optional(),
  codingDictionary: z.nativeEnum(DictionaryType).optional(),
  codingLink: medicalCodingLinkSchema.optional(),
  isPHI: z.boolean().optional(),
  permissions: rolePermissionsSchema.optional(),
  isLogKey: z.boolean().optional(),
  isPasswordBox: z.boolean().optional(),
  sdvTier: z.nativeEnum(SdvTier).optional(),
  requiresMedicalReview: z.boolean().optional(),
  requiresDataReview: z.boolean().optional(),
  requireChangeReason: z.boolean().optional(),
  allowInvestigatorComment: z.boolean().optional(),
  isStratificationFactor: z.boolean().optional(),
  prePopulateSource: dataPipeSourceSchema.optional(),
  derivation: derivationConfigSchema.optional(),
  isExpiration: z.boolean().optional(),
  labConfig: labConfigSchema.optional(),
  sensorConfig: sensorConfigSchema.optional(),
  origin: z.nativeEnum(DataOrigin).optional(),
  method: z.nativeEnum(CollectionMethod).optional(),
  methodOid: z.string().optional(),
  comment: z.string().optional(),
  validation: itemValidationSchema.optional(),
  sdtmMapping: sdtmMappingSchema.optional(),
  adamMapping: adamMappingSchema.optional(),
  defaultValue: z.string().optional(),
  editChecks: z.array(editCheckSchema).optional(),
  captureTimezone: z.boolean().optional(),
  timeFormat: z.enum(["12h", "24h"]).optional(),
  timePrecision: z.enum(["HH:mm", "HH:mm:ss"]).optional(),
  paperLayout: z.nativeEnum(PaperLayoutFormat).optional(),
  displayWidth: z.union([z.string(), z.number()]).optional(),
  displayLines: z.number().optional(),
  vasConfig: vasConfigSchema.optional(),
  assetConfig: assetConfigSchema.optional(),
  instructions: translatedTextSchema.optional(),
  placeholderText: translatedTextSchema.optional(),
  tooltipHelp: translatedTextSchema.optional(),
  isHidden: z.boolean().optional(),
  showIf: z.string().optional(),
  enableIf: z.string().optional(),
  customProperties: z.record(z.string(), z.any()).optional(),
});

export const crfFormElementSchema = z.union([crfItemSchema, crfDisplayBlockElementSchema]);

export const itemGroupSchema = z.object({
  groupOid: z.string().optional(),
  name: z.string(),
  label: translatedTextSchema.optional(),
  tabLabel: translatedTextSchema.optional(),
  repeating: z.boolean(),
  groupLayout: z.nativeEnum(GroupLayout).optional(),
  minRows: z.number().optional(),
  maxRows: z.number().optional(),
  assetConfig: assetConfigSchema.optional(),
  showIf: z.string().optional(),
  orderNumber: z.number().optional(),
  items: z.array(crfFormElementSchema),
  customProperties: z.record(z.string(), z.any()).optional(),
});

export const crfFormSchema = z.object({
  formOid: z.string(),
  formName: z.string(),
  repeating: z.boolean(),
  formType: z.nativeEnum(FormType).optional(),
  orderNumber: z.number().optional(),
  effectiveVersion: z.string().optional(),
  signatureMeaning: z.nativeEnum(SignatureMeaning).optional(),
  sdvTier: z.nativeEnum(SdvTier).optional(),
  permissions: rolePermissionsSchema.optional(),
  systemTriggers: z.array(systemTriggerSchema).optional(),
  formLayout: z.nativeEnum(FormLayout).optional(),
  pageLayout: z.nativeEnum(PageLayout).optional(),
  headerText: translatedTextSchema.optional(),
  footerText: translatedTextSchema.optional(),
  itemGroups: z.array(itemGroupSchema),
  customProperties: z.record(z.string(), z.any()).optional(),
});

export const eventFormRefSchema = z.object({
  formOid: z.string(),
  orderNumber: z.number().optional(),
  mandatory: z.boolean(),
  showIf: z.string().optional(),
  availableFromTime: z.string().optional(),
  availableToTime: z.string().optional(),
  reminderText: translatedTextSchema.optional(),
});

export const studyEventSchema = z.object({
  eventOid: z.string(),
  eventName: z.string(),
  eventType: z.nativeEnum(EventType),
  epoch: z.string().optional(),
  orderNumber: z.number().optional(),
  targetDay: z.number().optional(),
  windowStart: z.number().optional(),
  windowEnd: z.number().optional(),
  anchorEventOid: z.string().optional(),
  anchorItemOid: z.string().optional(),
  signatureMeaning: z.nativeEnum(SignatureMeaning).optional(),
  showIf: z.string().optional(),
  systemTriggers: z.array(systemTriggerSchema).optional(),
  forms: z.array(eventFormRefSchema),
  customProperties: z.record(z.string(), z.any()).optional(),
});

export const studyMetadataSchema = z.object({
  protocolId: z.string(),
  studyName: z.string(),
  phase: z.string().optional(),
  sponsor: z.string().optional(),
  version: z.string(),
  defaultLanguage: z.string(),
  supportedLanguages: z.array(z.string()).optional(),
  dateGenerated: z.string().optional(),
  dictionaryVersions: z.record(z.nativeEnum(DictionaryType), z.string()).optional(),
  customProperties: z.record(z.string(), z.any()).optional(),
});

export const studyDesignSchema = z.object({
  metadata: studyMetadataSchema,
  events: z.array(studyEventSchema),
  forms: z.record(z.string(), crfFormSchema),
  codelists: z.record(z.string(), codelistSchema),
  rules: z.array(z.any()).optional(),
  methods: z.record(z.string(), methodDefinitionSchema).optional(),
  submissionMetadata: submissionMetadataSchema.optional(),
  crossFormDependencies: z.array(z.any()).optional(),
});
