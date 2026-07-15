/**
 * @issue #292
 */
export const SHEET_NAMES = {
  STUDY: "_Study",
  FORMS: "_Forms",
  SCHEDULE: "_Schedule",
  CODELISTS: "_Codelists",
  METHODS: "_Methods",
  RULES: "_Rules",
  JUSTIFICATIONS: "_Justifications",
} as const;

export const SHEET_HEADERS: Record<string, string[]> = {
  [SHEET_NAMES.STUDY]: ["Protocol ID", "Study Name", "Version", "Default Language"],
  [SHEET_NAMES.FORMS]: ["Form OID", "Form Name", "Repeating", "Page Layout"],
  [SHEET_NAMES.SCHEDULE]: ["Form OID", "Visit 1 (Day 0)", "Visit 2 (Day 14)", "Visit 3 (Day 28)"],
  [SHEET_NAMES.CODELISTS]: ["Codelist ID", "Codelist Name", "Coded Value", "Decode"],
  [SHEET_NAMES.METHODS]: [
    "Method OID",
    "Name",
    "Type",
    "Description",
    "Expression",
    "Referenced Variables",
  ],
  [SHEET_NAMES.RULES]: [
    "Rule ID",
    "Rule Name",
    "Type",
    "Target",
    "Expression",
    "Error Message",
    "Description",
  ],
  [SHEET_NAMES.JUSTIFICATIONS]: ["ItemKey", "Reason", "UserId", "Timestamp"],
};

export const SYSTEM_SHEETS = [
  SHEET_NAMES.STUDY,
  SHEET_NAMES.FORMS,
  SHEET_NAMES.SCHEDULE,
  SHEET_NAMES.CODELISTS,
  SHEET_NAMES.METHODS,
  SHEET_NAMES.RULES,
  SHEET_NAMES.JUSTIFICATIONS,
];

export function getDefaultData(sheetName: string, locale: string): any[][] {
  switch (sheetName) {
    case SHEET_NAMES.STUDY:
      return [["PROT-001", "Matrix Clinical Trial", "1.0", locale]];
    case SHEET_NAMES.FORMS:
      return [
        ["DEMO", "Demographics", "No", "Portrait"],
        ["VS", "Vital Signs", "Yes", "Portrait"],
      ];
    case SHEET_NAMES.CODELISTS:
      return [
        ["GENDER", "Gender", "M", "Male"],
        ["GENDER", "Gender", "F", "Female"],
      ];
    case SHEET_NAMES.METHODS:
      return [
        [
          "M_DERIVED_BMI",
          "BMI Derivation",
          "Computation",
          "Body Mass Index",
          "[WEIGHT] / ([HEIGHT]/100)^2",
          "WEIGHT, HEIGHT",
        ],
      ];
    default:
      return [];
  }
}
