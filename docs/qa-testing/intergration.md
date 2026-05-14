CRF.xl: Integration Testing Specification

1. Office.js & Excel Host Synchronization

Objective: Ensure stable, bi-directional communication between the React Task Pane and the Excel Host.

1.1 Excel Environment Synchronization

Sheet Discovery:

Test: Delete a mandatory sheet (e.g., Items) and click "Analyze".

Expected: A user-friendly error message in the ValidationLog stating the sheet is missing.

Edit Mode Guardrails:

Test: Attempt to parse while a cell is in "Edit Mode" (cursor active in cell).

Expected: The engine should gracefully wait for context.sync() or notify the user to press Enter.

Hidden Data Handling:

Test: Hide the Metadata sheet.

Expected: Office.js should still successfully extract values from hidden worksheets.

1.2 Navigation Heuristics ("Go to Source")

Index Accuracy:

Action: Click "Inspect" on an error for an Item on row 50.

Expected: Excel activates the Items sheet and highlights/selects the range at row 50.

Sorting/Filtering Resilience:

Test: Filter the Items sheet so row 50 is hidden, then click "Inspect".

Expected: Excel should clear filters or specifically reveal and select the hidden target row.

2. UI-to-Core Communication

Status Orchestration: Verify that App.tsx correctly transitions from Ready -> Analyzing -> Validated/Error states.

Stepper Logic: Ensure the "Export" step remains disabled until all "Hard Errors" are cleared from the validation log.

Template Scaffolding: Verify that "Initialize Workbook" applies native Excel Data Validation (dropdowns) correctly to the Items sheet.
