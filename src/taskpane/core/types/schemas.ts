import { z } from "zod";
import { DataType, DictionaryType, DataOrigin, CollectionMethod, SdvTier, FormType, PaperLayoutFormat, GroupLayout, FormLayout, PageLayout, SignatureMeaning, EventType, SystemTriggerType } from "./enums";

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

export const translatedTextSchema = z.record(z.string(), z.string());
export const rolePermissionsSchema = z.object({
  read: z.array(z.string()).optional(),
  write: z.array(z.string()).optional(),
  blindedRoles: z.array(z.string()).optional(),
});

export const crfDisplayBlockSchema = z.object({
  nodeType: z.literal("display"),
  displayType: z.enum(["heading", "instruction", "separator"]),
  content: z.string(),
  _sourceRowIndex: z.number(),
});

export const crfItemSchema = z.object({
  nodeType: z.literal("item").optional(),
  formOid: z.string(),
  groupOid: z.string(),
  itemOid: z.string(),
  orderNumber: z.number(),
  effectiveVersion: z.string(),
  name: z.string(),
  label: translatedTextSchema,
  shortName: z.string().optional(),
  postText: translatedTextSchema.optional(),
  rightText: translatedTextSchema.optional(),
  exportTextChecked: z.string().optional(),
  exportTextUnchecked: z.string().optional(),
  dataType: z.nativeEnum(DataType),
  length: z.number().optional(),
  significantDigits: z.number().optional(),
  measurementUnit: z.string().optional(),
  unitCodelistId: z.string().optional(),
  codelistId: z.string().optional(),
  codingDictionary: z.nativeEnum(DictionaryType).optional(),
  codingLink: z.any().optional(),
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
  derivation: z.any().optional(),
  isExpiration: z.boolean().optional(),
  labConfig: z.any().optional(),
  sensorConfig: z.any().optional(),
  origin: z.nativeEnum(DataOrigin).optional(),
  method: z.nativeEnum(CollectionMethod).optional(),
  methodOid: z.string().optional(),
  comment: z.string().optional(),
  validation: z.any(),
  sdtmMapping: z.any().optional(),
  adamMapping: z.any().optional(),
  defaultValue: z.string().optional(),
  editChecks: z.array(z.any()).optional(),
  captureTimezone: z.boolean().optional(),
  timeFormat: z.enum(["12h", "24h"]).optional(),
  timePrecision: z.enum(["HH:mm", "HH:mm:ss"]).optional(),
  paperLayout: z.nativeEnum(PaperLayoutFormat).optional(),
  displayWidth: z.union([z.string(), z.number()]).optional(),
  displayLines: z.number().optional(),
  vasConfig: z.any().optional(),
  assetConfig: z.any().optional(),
  instructions: translatedTextSchema.optional(),
  placeholderText: translatedTextSchema.optional(),
  tooltipHelp: translatedTextSchema.optional(),
  isHidden: z.boolean().optional(),
  showIf: z.string().optional(),
  enableIf: z.string().optional(),
  customProperties: z.record(z.string(), z.any()).optional(),
});

export const crfFormElementSchema = z.union([crfItemSchema, crfDisplayBlockSchema]);

export const itemGroupSchema = z.object({
  groupOid: z.string(),
  name: z.string(),
  label: translatedTextSchema.optional(),
  tabLabel: translatedTextSchema.optional(),
  repeating: z.boolean(),
  groupLayout: z.nativeEnum(GroupLayout).optional(),
  minRows: z.number().optional(),
  maxRows: z.number().optional(),
  assetConfig: z.any().optional(),
  showIf: z.string().optional(),
  orderNumber: z.number(),
  items: z.array(crfFormElementSchema),
  customProperties: z.record(z.string(), z.any()).optional(),
});

export const crfFormSchema = z.object({
  formOid: z.string(),
  formName: z.string(),
  repeating: z.boolean(),
  formType: z.nativeEnum(FormType).optional(),
  orderNumber: z.number(),
  effectiveVersion: z.string(),
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
  orderNumber: z.number(),
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
  orderNumber: z.number(),
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
  codelists: z.record(z.string(), z.any()),
  rules: z.array(z.any()).optional(),
  methods: z.record(z.string(), z.any()).optional(),
  submissionMetadata: z.any().optional(),
  crossFormDependencies: z.array(z.any()).optional(),
});
