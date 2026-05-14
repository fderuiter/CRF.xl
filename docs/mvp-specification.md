# CRF.xl: Clinical Metadata Engine - MVP Specification
## 1. Project Overview
CRF.xl is a Microsoft Excel Add-in designed to bridge the gap between clinical study design (specifications) and production-ready outputs (Paper CRFs and CDISC ODM XML). It allows Data Managers to use Excel as a structured authoring environment.
## 2. Technical Architecture
- Frontend: React (Functional Components + Hooks)
- Styling: Tailwind CSS
- API: Office.js (Excel JavaScript API)
- Engine: Modular TypeScript Core
- Generators:
- docx: Handwriting-optimized Word document generation.
- cdisc: XML serialization for CDISC ODM v1.3.2.
## 3. Functional Requirements (MVP)
### 3.1 Template Management
- Initialize Workbook: Must scaffold five core sheets: Metadata, Events, Forms, Items, and Codelists.
- Environmental Awareness: Automatically detect and populate Default Language (Office UI language) and Protocol ID (Filename).
- In-Cell Protection: Implement Excel Data Validation (dropdowns) for "Variable Type" and "Required" columns.
### 3.2 Metadata Parsing (The Parser)
- Hierarchical Assembly: Correct mapping of Event -> Form -> ItemGroup -> Item.
- Codelist Aggregation: Ability to group multiple rows sharing the same Codelist ID into a single object.
- Script Capture: Extraction of Show If logic and Derivation formulas from Excel cells.
- Source Tracking: Must record the rowIndex for every clinical item to enable "Go to Source" navigation.
### 3.3 Clinical Validation
- Referential Integrity: Every Item referencing a Codelist ID must have a matching entry in the Codelists sheet.
- Logic Verification: Check for empty Events or Forms without Items.
- Severity Levels:
- Errors: Blockers that prevent export (e.g., duplicate OIDs, missing codelists).
- Warnings: Quality flags (e.g., missing SAS labels, empty events).
### 3.4 Export Capabilities
- Paper CRF (.docx):
- Page-per-form layout with clinical headers (Subject ID, Visit Date).
- Input affordances for Combs, Checkboxes, and Visual Analog Scales (VAS).
- Investigator signature blocks.
- CDISC ODM (.xml):
- Compliant with v1.3.2 schemas.
- Inclusion of <Alias> tags for SDTM mapping.
- Support for <RangeCheck> and <ConditionDef> based on Excel logic.
## 4. UI/UX Requirements
- Guided Workflow: A 4-step stepper (Setup -> Author -> Analyze -> Export).
- Contextual Navigation: A "Go to Source" link on every validation issue.
- Real-time Status: Visible feedback during long-running parsing or generation tasks.