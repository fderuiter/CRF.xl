# CRF.xl: Unit Testing Specification

## 1. Core Logic & Data Transformation

Objective: Verify that the TypeScript core correctly processes metadata independent of the Excel UI layer.

### 1.1 Type Casting & Coercion (The "Parser" Pass)

| Scenario | Excel Input | Expected TS Property | Data Type |
|---|---|---|---|
| Boolean True | "Yes", "TRUE", "1" | true | boolean |
| Boolean False | "No", "FALSE", "0" | false | boolean |
| Integer Casting | "01.0", "42" | 1, 42 | number (Int) |
| Float Casting | "98.60" | 98.6 | number (Float) |
| Empty Handling | null or "" | undefined | N/A |
### 1.2 Clinical Logic Aggregation

Codelist Grouping Heuristics:

Test: Input 5 rows in the 'Codelists' sheet with the ID GENDER_CL.

Success: The StudyDesign.codelists record contains exactly one entry for GENDER_CL with an items array of length 5.

Hierarchy Reconstruction:

Test: Item WT references Form VS and Group VITALS.

Success: The VS Form object contains a VITALS Group object, which in turn contains the WT Item object.

### 1.3 String Sanitization & Clinical Bounds

XML Escaping: Verify that labels containing &, <, or > are transformed (e.g., & becomes &amp;) to prevent XML parser crashes.

SAS Regulatory Constraints:

sasFieldName: Must fail validation if > 8 characters.

sasLabel: Must trigger a warning if > 40 characters.

## 2. Validation Engine Rules

Objective: Verify referential integrity checks.

VAL-001: Verify Error if CrfItem.codelistId does not exist in StudyDesign.codelists.

VAL-002: Verify Warning if CrfItem.sasLabel is missing but Variable Name is present.

VAL-003: Verify Error if duplicate itemOid exists within the same formOid.
