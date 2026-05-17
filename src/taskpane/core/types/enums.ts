/**
 * ============================================================================
 * enums.ts
 * ============================================================================
 * Global literals, enums, and constants for the CRF.xl clinical engine.
 */

export enum DataType {
    TEXT = 'Text',
    INTEGER = 'Integer',
    FLOAT = 'Float',
    DATE = 'Date',
    TIME = 'Time',
    DATETIME = 'Datetime',
    PARTIAL_DATE = 'PartialDate',
    PARTIAL_DATETIME = 'PartialDatetime',
    BOOLEAN = 'Boolean',
    CODELIST = 'Codelist',
    FILE = 'File',
    ANNOTATION = 'Annotation',
    DISPLAY_ONLY = 'DisplayOnly'
}

export enum PaperLayoutFormat {
    STANDARD = 'Standard',
    COMB = 'Comb',
    CHECKBOX_INLINE = 'CheckboxInline',
    CHECKBOX_LIST = 'CheckboxList',
    RADIO_INLINE = 'RadioInline',
    RADIO_LIST = 'RadioList',
    VAS = 'VisualAnalogScale',
    IMAGE_MAP = 'ImageMap'
}

export enum GroupLayout {
    VERTICAL = 'Vertical',
    HORIZONTAL = 'Horizontal',
    MATRIX = 'Matrix'
}

export enum FormLayout {
    FLAT = 'Flat',
    TABS = 'Tabs',
    WIZARD = 'Wizard'
}

export enum PageLayout {
    PORTRAIT = 'Portrait',
    LANDSCAPE = 'Landscape'
}

export enum EventType {
    SCHEDULED = 'Scheduled',
    UNSCHEDULED = 'Unscheduled',
    COMMON = 'Common'
}

export enum SdtmCore {
    REQUIRED = 'Required',
    EXPECTED = 'Expected',
    PERMISSIBLE = 'Permissible'
}

export enum FormType {
    CRF = 'CRF',
    PRO = 'PRO',
    LOG = 'Log'
}

export enum RangeValueType {
    LITERAL = 'Literal',
    ITEM_REF = 'ItemRef'
}

export enum DictionaryType {
    MEDDRA = 'MedDRA',
    WHODRUG = 'WHODrug',
    CTCAE = 'CTCAE'
}

export enum CodingTermType {
    VERBATIM = 'Verbatim',
    CODED = 'Coded'
}

export enum DataOrigin {
    CRF = 'CRF',
    DERIVED = 'Derived',
    EPRO = 'ePRO',
    CENTRAL_LAB = 'CentralLab',
    WEARABLE_SENSOR = 'Sensor',
    PRE_POPULATED = 'PrePopulated'
}

export enum CollectionMethod {
    INTERVIEW = 'Interview',
    OBSERVATION = 'Observation',
    INSTRUMENT = 'Instrument'
}

export enum QuerySeverity {
    HARD_ERROR = 'HardError',
    SOFT_WARNING = 'SoftWarning',
    QUERY = 'Query',
    PROTOCOL_DEVIATION = 'ProtocolDev'
}

export enum SignatureMeaning {
    AUTHORSHIP = 'Authorship',
    APPROVAL = 'Approval',
    RESPONSIBILITY = 'Responsibility'
}

export enum SdvTier {
    ALL = '100%',
    TARGETED = 'Targeted',
    NONE = 'None'
}

export enum LabType {
    LOCAL = 'Local',
    CENTRAL = 'Central'
}

export enum SystemTriggerType {
    RANDOMIZATION = 'Randomization',
    DISPENSATION = 'Dispensation',
    EXTERNAL_SCORING = 'ExternalScoring',
    LOCK_PATIENT = 'LockPatient'
}

export enum AggregateFunction {
    SUM = 'Sum',
    AVERAGE = 'Average',
    MIN = 'Min',
    MAX = 'Max',
    COUNT = 'Count'
}

export enum VasOrientation {
    HORIZONTAL = 'Horizontal',
    VERTICAL = 'Vertical'
}

export enum DateImputationRule {
    FIRST_OF_MONTH = 'FirstOfMonth',
    MID_MONTH = 'MidMonth',
    LAST_OF_MONTH = 'LastOfMonth',
    FIRST_OF_YEAR = 'FirstOfYear',
    MID_YEAR = 'MidYear',
    LAST_OF_YEAR = 'LastOfYear'
}