# CRF.xl: Quality Assurance & Testing Requirements

## 1. Unit Testing (Logic Verification)
**Goal:** Ensure the core TypeScript engine handles data transformations correctly.

* **Type Casting:** Verify that "Yes/No" strings in Excel are correctly converted to booleans in the StudyDesign object.
* **Codelist Grouping:** Test the parser with a 10-row codelist to ensure it generates 1 Codelist object with 10 items, rather than 10 separate codelists.
* **XML Sanitization:** Ensure special characters (`&`, `<`, `>`) in Excel labels are escaped to prevent XML corruption.

## 2. Integration Testing (Office.js & Navigation)
**Goal:** Ensure the Add-in communicates reliably with the Excel environment.

* **Sheet Detection:** Test behavior when required sheets (e.g., Items) are missing or renamed.
* **Navigation Precision:** Verify that clicking "Go to Source" on a validation error on row 45 actually selects row 45 in the correct sheet.
* **Data Validation:** Confirm that the "Initialize" function correctly applies dropdown menus to the specified columns.

## 3. System Testing (End-to-End)
**Goal:** Validate the final output against industry standards.

* **ODM Validation:**
  * Import the generated `.xml` into a CDISC validator (or a mock EDC like OpenClinica).
  * Verify that all OIDs follow the `[A-Za-z0-9._-]` character set.
* **Docx Layout:**
  * Generate a document with 20 forms.
  * Verify that "Page Break Before" is correctly applied to each Form header.
  * Ensure Landscape orientation works for wide Matrix groups.
* **Performance:**
  * Test with a "Large Study" (500+ items).
  * Measure parsing time; target is `< 3 seconds` to prevent UI freezing.

## 4. Regression Test Cases

| ID | Title | Expected Result |
|---|---|---|
| TC-01 | Re-Initialization | Running 'Initialize' on an existing workbook clears data but preserves sheet names. |
| TC-02 | Cross-Sheet Ref | Item 'A' on Form 'B' references Codelist 'C'. Parser connects them successfully. |
| TC-03 | Export Blocking | 'Export' buttons remain disabled if a 'Critical Error' is active in the log. |
| TC-04 | Logic Capture | A Show If script with `$` or complex syntax is preserved exactly in the XML. |

## 5. User Acceptance Criteria (UAC)

1. I can generate a usable Paper CRF in under 30 seconds.
2. I can identify and jump to a metadata error in under 2 clicks.
3. The generated XML contains all SAS Labels required for biostatistics.
