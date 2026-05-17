/**
 * ============================================================================
 * clinical.ts
 * ============================================================================
 * CDISC mappings, dictionary typings, and external integration points.
 */

import { TranslatedText } from './common';
import { CodingTermType, DataType, LabType, SdtmCore } from './enums';

export interface SensorConfig {
    deviceType: string;
    metricId: string;
    frequency?: string;
}

export interface LabConfig {
    labType: LabType;
    labTestCode: string;
    nciLabCode?: string;
}

export interface MedicalCodingLink {
    termType: CodingTermType;
    linkedItemOid: string;
    dictionaryLevel?: string;
}

export interface SdtmMapping {
    domain: string;
    variable: string;
    nciVariableCode?: string;
    sasFieldName?: string;
    sasLabel?: string;
    sasDatasetName?: string;
    core?: SdtmCore;
    role?: string;
}

export interface CodelistItem {
    codelistId: string;
    codedValue: string;
    decodedText: TranslatedText;
    orderNumber: number;
    nciCode?: string;
    specifyItemOid?: string;
    parentCodedValue?: string;
}

export interface Codelist {
    codelistId: string;
    codelistName: string;
    dataType: DataType;
    nciCodelistCode?: string;
    parentItemOid?: string;
    subsetOfCodelistId?: string;
    items: CodelistItem[];
    customProperties?: Record<string, any>;
}