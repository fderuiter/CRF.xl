CRF.xl: Template & Workbook Scaffolding Specification

1. Purpose

Defines the required state of the Excel environment for the CRF.xl engine to function.

2. Sheet Specifications

The system requires five mandatory sheets. If missing, the "Initialize" feature must create them with the following headers:

2.1 Metadata

Description: High-level study identity.

Required Columns: Protocol ID, Study Name, Version, Default Language.

Logic: Auto-populate Default Language with Office.context.displayLanguage.

2.2 Events (Visits)

Description: Defines the visit schedule.

Required Columns: Event ID, Event Name, Sequence, Show If, Forms.

Constraints: Forms column must support comma-separated Form IDs.

2.3 Forms (CRF Pages)

Description: Defines individual case report forms.

Required Columns: Form ID, Form Name, Sequence, Repeating, Show If.

Constraints: Repeating column supports Yes/No.

2.4 Items (Questions)

Description: The primary metadata repository.

Required Columns: Form, Page, Variable Name, Label, Variable Type, Sequence, SAS Label, Required Field, Minimum Value, Maximum Value, Show If, Derivation, Dependencies, Required If, Validation Script.

2.5 Codelists (Dictionaries)

Description: Definitions for dropdowns/radio buttons.

Required Columns: Codelist ID, Codelist Name, Coded Value, Decode, Sequence.

3. Native Excel Data Validation

The initialization engine must inject the following dropdowns to prevent user error:

Variable Type: Text, Integer, Float, Date, Time, Datetime, Boolean, Codelist, File.

Required Field: Yes, No.

Repeating (Forms): Yes, No.

4. Visual Styles

Headers: Background #1e3a8a (Blue 900), Font White, Bold.

Panes: Freeze Top Row on all generated sheets.

Column Width: Auto-fit after header creation.
