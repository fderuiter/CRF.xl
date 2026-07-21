# CRF.xl: User Acceptance Testing (UAT) Suite

## 1. Scenario 1: New Study Initialization

User Action: Clicks "Initialize Workbook" on a fresh Excel file.

Verification:

5 sheets are created with correct headers.

Column dropdowns work in the Items sheet.

Metadata is pre-populated from the filename.

## 2. Scenario 2: Authoring with Branching Logic

User Action:

Adds a question: "Is the subject pregnant?" (PREG_YN).

Adds a question: "Pregnancy Test Result" (PREG_RES).

Sets showIf for PREG_RES to IT.PREG_YN == 'Yes'.

Verification:

Analysis completes without errors.

ODM XML contains the `<ConditionDef>` for the branching logic.

Word Doc renders the skip instruction correctly.

## 3. Scenario 3: Resolving Integrity Errors

User Action:

Enters a 'Codelist' type item.

Sets Codelist ID to NON_EXISTENT_CL.

Runs Analysis.

Verification:

System displays a Red Error: "Missing Codelist NON_EXISTENT_CL".

User clicks "Inspect".

Excel focuses the correct row.

User fixes the ID, re-runs, and error disappears.

## 4. Scenario 4: Final Metadata Export

User Action: Runs full analysis and exports ODM XML.

Verification:

XML opens in a browser/editor without parsing errors.

SAS labels are visible in the `<ItemDef>` attributes.

File naming convention matches the protocol version.
