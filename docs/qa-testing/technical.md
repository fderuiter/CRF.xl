CRF.xl: Technical Testing Specification (Unit & Integration)

1. Unit Testing: Data Transformation Engine

Objective: Verify that the TypeScript core correctly processes clinical metadata independent of the Excel UI.

1.1 Type Casting & Coercion (The "Parser" Pass)

Test Case

Input (Excel String)

Expected Output (TS Object)

Boolean True

"Yes", "TRUE", "1"

boolean: true

Boolean False

"No", "FALSE", "0"

boolean: false

Numeric Sequence

"01.0", "2"

number: 1, number: 2 (Integers)

Partial Date Flag

"DD-MMM-YYYY" (with null DD)

allowPartialDD: true

Null Handling

"" (Empty Cell)

undefined or null (not "")

1.2 Clinical Logic Aggregation

Codelist Grouping:

Scenario: 3 rows in Codelists sheet with ID 'GENDER'.

Verification: Final StudyDesign contains 1 Codelist object with an items array of length 3.

Hierarchy Assembly:

Scenario: Item 'WEIGHT' lists Form 'VS' and Group 'VITALS'.

Verification: study.forms['VS'].itemGroups.find(g => g.groupOid === 'VITALS').items contains 'WEIGHT'.

1.3 String Sanitization & Clinical Limits

XML Escaping: Input "Pain & Fatigue" must be transformed to "Pain &amp; Fatigue" in the model.

SAS Constraints:

sasLabel: Input > 40 chars must trigger a Warning.

sasFieldName: Input > 8 chars must be flagged as a Critical Error.

2. Integration Testing: Office.js Bridge

Objective: Ensure stable communication between the Task Pane and the Excel host.

2.1 Excel Environment Sync

Cell Edit Mode: Attempt to "Run Analysis" while a cell is active (in-edit).

Expected: Add-in should handle the error gracefully or wait for context.sync() to resolve.

Sheet State:

Missing Sheet: Delete the 'Items' sheet and click Analyze. (Expected: User-friendly error message).

Hidden Sheet: Hide the 'Codelists' sheet. (Expected: Office.js should still be able to read data).

2.2 Navigation Logic

Precision Mapping:

Action: Click "Go to Source" on an error for Item 50.

Verification: Excel activates the 'Items' sheet and selects the exact row corresponding to that Item's _sourceRowIndex.

Dynamic Sorting: Filter the 'Items' sheet in Excel, then click "Go to Source".

Verification: Selection must still land on the correct Item regardless of the active filter/sort state.

2.3 Scaffolding (The "Initialize" Flow)

Sheet Conflict: Run "Initialize" on a workbook that already has a sheet named "Items".

Expected: Prompt user for "Overwrite" or "Skip".

Data Validation Injection:

Action: Run "Initialize".

Verification: Column E in 'Items' sheet now has a dropdown menu containing: Text, Integer, Float, Date, Codelist, etc.
