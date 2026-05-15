# CRF.xl: Clinical Validation Rules Dictionary

## 1. Error Levels

Critical Error (Blocker): Prevents export. Usually indicates broken data links.

Quality Warning: Suggests a best-practice violation. Does not block export.

## 2. Referential Integrity Rules

| Rule ID | Level | Message | Logic |
|---|---|---|---|
| VAL-01 | Error | Missing Codelist | Item has type 'Codelist' but ID is not found in the Codelists sheet. |
| VAL-02 | Error | Duplicate OID | Two Items share the same Variable Name within the same Form. |
| VAL-03 | Error | Invalid Form Ref | Event references a Form ID that does not exist in the Forms sheet. |
## 3. Metadata Standards (CDISC/Regulatory)

| Rule ID | Level | Message | Logic |
|---|---|---|---|
| REG-01 | Warning | Missing SAS Label | Variable Name is present but SAS Label is empty (required for SDTM). |
| REG-02 | Warning | SAS Length Violation | SAS Label exceeds 40 characters or SAS Field Name exceeds 8 characters. |
| REG-03 | Warning | Illegal Characters | OID contains characters other than A-Z, 0-9, _, -. |
## 4. UI/Handwriting Logic

| Rule ID | Level | Message | Logic |
|---|---|---|---|
| UI-01 | Warning | Missing Label | Item exists but 'Label' is empty (will result in blank question on Paper CRF). |
| UI-02 | Warning | Empty Event | Event exists in visit schedule but has no forms assigned. |

## 5. Current `validator.ts` implementation notes (tested)

- Duplicate OID detection is currently **study-wide** (global across all forms), not per form.
- Codelist validation also triggers when `codelistId` is present, even if `dataType` is not explicitly `Codelist`.
- Missing variable errors rely on optional `rowIndex`; when absent, the location becomes `FormOid > Row undefined`.
- `activeSheetFilter` only filters for non-system tabs. Filters that start with `_` (for example `_Schedule`) intentionally return all issues.
