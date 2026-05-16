/**
 * ============================================================================
 * hierarchy.ts
 * ============================================================================
 * The core building blocks of the trial (Items -> Groups -> Forms -> Events).
 */

import { TranslatedText, RolePermissions, SystemAlias } from "./common";
import {
  DataType,
  DictionaryType,
  DataOrigin,
  CollectionMethod,
  SdvTier,
  FormType,
  PaperLayoutFormat,
  GroupLayout,
  FormLayout,
  PageLayout,
  SignatureMeaning,
  EventType,
  SystemTriggerType,
} from "./enums";
import { DerivationConfig, ItemValidation, EditCheck } from "./validation";
import { LabConfig, SensorConfig, MedicalCodingLink, SdtmMapping, Codelist } from "./clinical";
import { AssetConfig, VasConfig } from "./ui";

export interface SystemTrigger {
  triggerType: SystemTriggerType;
  triggerTiming: "OnSave" | "OnSign";
  payloadMap?: Record<string, string>;
}

export interface DataPipeSource {
  eventOid?: string;
  formOid?: string;
  itemOid: string;
}

export interface CrfItem {
  formOid: string;
  groupOid: string;
  itemOid: string;
  orderNumber: number;
  effectiveVersion: string;
  retiredVersion?: string;

  name: string;
  label: TranslatedText;
  shortName?: string;
  postText?: TranslatedText;
  rightText?: TranslatedText;
  exportTextChecked?: string;
  exportTextUnchecked?: string;

  dataType: DataType;
  length?: number;
  significantDigits?: number;
  measurementUnit?: string;
  unitCodelistId?: string;
  codelistId?: string;

  codingDictionary?: DictionaryType;
  codingLink?: MedicalCodingLink;

  isPHI?: boolean;
  permissions?: RolePermissions;
  isLogKey?: boolean;
  isPasswordBox?: boolean;

  sdvTier?: SdvTier;
  requiresMedicalReview?: boolean;
  requiresDataReview?: boolean;
  requireChangeReason?: boolean;
  allowInvestigatorComment?: boolean;

  isStratificationFactor?: boolean;
  prePopulateSource?: DataPipeSource;
  derivation?: DerivationConfig;
  isExpiration?: boolean;

  labConfig?: LabConfig;
  sensorConfig?: SensorConfig;

  origin?: DataOrigin;
  method?: CollectionMethod;

  validation: ItemValidation;
  sdtmMapping?: SdtmMapping;
  aliases?: SystemAlias[];
  defaultValue?: string;
  editChecks?: EditCheck[];

  captureTimezone?: boolean;
  timeFormat?: "12h" | "24h";
  timePrecision?: "HH:mm" | "HH:mm:ss";

  paperLayout?: PaperLayoutFormat;
  displayWidth?: string | number;
  displayLines?: number;
  vasConfig?: VasConfig;
  assetConfig?: AssetConfig;
  instructions?: TranslatedText;
  placeholderText?: TranslatedText;
  tooltipHelp?: TranslatedText;
  isHidden?: boolean;

  showIf?: string;
  enableIf?: string;
  skipLogic?: string;

  customProperties?: Record<string, any>;
}

export interface ItemGroup {
  groupOid: string;
  name: string;
  label?: TranslatedText;
  tabLabel?: TranslatedText;

  repeating: boolean;
  groupLayout?: GroupLayout;
  minRows?: number;
  maxRows?: number;
  assetConfig?: AssetConfig;

  showIf?: string;
  orderNumber: number;
  aliases?: SystemAlias[];
  items: CrfItem[];

  customProperties?: Record<string, any>;
}

export interface CrfForm {
  formOid: string;
  formName: string;
  repeating: boolean;
  formType?: FormType;
  orderNumber: number;
  effectiveVersion: string;
  retiredVersion?: string;

  signatureMeaning?: SignatureMeaning;
  sdvTier?: SdvTier;
  permissions?: RolePermissions;

  systemTriggers?: SystemTrigger[];

  formLayout?: FormLayout;
  pageLayout?: PageLayout;
  headerText?: TranslatedText;
  footerText?: TranslatedText;

  aliases?: SystemAlias[];
  itemGroups: ItemGroup[];

  customProperties?: Record<string, any>;
}

export interface EventFormRef {
  formOid: string;
  orderNumber: number;
  mandatory: boolean;
  showIf?: string;

  availableFromTime?: string;
  availableToTime?: string;
  reminderText?: TranslatedText;
}

export interface StudyEvent {
  eventOid: string;
  eventName: string;
  eventType: EventType;
  epoch?: string;
  orderNumber: number;

  targetDay?: number;
  windowStart?: number;
  windowEnd?: number;
  anchorEventOid?: string;
  anchorItemOid?: string;

  signatureMeaning?: SignatureMeaning;
  showIf?: string;
  systemTriggers?: SystemTrigger[];

  aliases?: SystemAlias[];
  forms: EventFormRef[];

  customProperties?: Record<string, any>;
}

export interface StudyMetadata {
  protocolId: string;
  studyName: string;
  phase?: string;
  sponsor?: string;
  version: string;
  defaultLanguage: string;
  supportedLanguages?: string[];
  dateGenerated?: string;
  dictionaryVersions?: Record<DictionaryType, string>;
  customProperties?: Record<string, any>;
}

export interface StudyDesign {
  metadata: StudyMetadata;
  events: StudyEvent[];
  forms: Record<string, CrfForm>;
  codelists: Record<string, Codelist>;
}
