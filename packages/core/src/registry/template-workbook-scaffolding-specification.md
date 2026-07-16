# CRF.xl: Template & Workbook Scaffolding Specification

## 1. Purpose

Defines the required state of the Excel environment for the CRF.xl engine to function.

## 2. Sheet Specifications

The system requires five mandatory sheets. If missing, the "Initialize" feature must create them with the following headers:

### 2.1 Metadata

Description: High-level study identity.

Required Columns: Protocol ID, Study Name, Version, Default Language.

Logic: Auto-populate Default Language with Office.context.displayLanguage.

### 2.2 Events (Visits)

Description: Defines the visit schedule.

Required Columns: Event ID, Event Name, Sequence, Show If, Forms.

Constraints: Forms column must support comma-separated Form IDs.

### 2.3 Forms (CRF Pages)

Description: Defines individual case report forms.

Required Columns: Form ID, Form Name, Sequence, Repeating, Show If.

Constraints: Repeating column supports Yes/No.

### 2.4 Items (Questions)

Description: The primary metadata repository.

Required Columns: Variable Name, Label, Variable Type, Required, Length, Significant Digits, Minimum, Maximum, Show If, Codelist ID, Origin, Method OID, SDTM Domain, SDTM Variable, Comment.

Variable-Level Metadata rules:

- `Origin` must use the controlled vocabulary `Collected`, `Derived`, `Assigned`, `Pre-Specified`, `External`, or `Other`.
- `Method OID` is required when `Origin` is `Derived` or `Assigned`.
- `Length` and `Significant Digits` are stored as positive/non-negative integers for export-ready numeric metadata.
- `SDTM Domain` and `SDTM Variable` are an optional paired mapping used by downstream ODM/Define-oriented export logic.

### 2.5 Codelists (Dictionaries)

Description: Definitions for dropdowns/radio buttons.

Required Columns: Codelist ID, Codelist Name, Coded Value, Decode, Sequence.

### 2.6 Methods

Description: Central registry of reusable derivation or assignment definitions referenced from item-level metadata.

Required Columns: Method OID, Name, Type, Description, Expression, Referenced Variables.

Clinical/regulatory rationale:

- Narrative method metadata and executable expressions must stay attached to stable method identifiers for downstream ODM/Define generation.
- `Referenced Variables` is stored as structured metadata so export builders and internal JSON consumers do not need ad hoc string parsing later.

## 3. Native Excel Data Validation

The initialization engine must inject the following dropdowns to prevent user error:

Variable Type: Text, Integer, Float, Date, Time, Datetime, Boolean, Codelist, File.

Required Field: Yes, No.

Repeating (Forms): Yes, No.

Origin: Collected, Derived, Assigned, Pre-Specified, External, Other.

## 4. Visual Styles

Headers: Background #1e3a8a (Blue 900), Font White, Bold.

Panes: Freeze Top Row on all generated sheets.

Column Width: Auto-fit after header creation.
