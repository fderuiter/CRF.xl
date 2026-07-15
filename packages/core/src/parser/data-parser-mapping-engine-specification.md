# CRF.xl: Data Parser & Mapping Engine Specification

## 1. Overview

The Parser is responsible for converting the tabular Excel data into a hierarchical StudyDesign tree.

## 2. Extraction Heuristics

Header Discovery: Columns must be located by name (case-insensitive), not index, to allow users to move columns.

Whitespace Handling: Trim all extracted strings.

Type Coercion:

Yes/No strings -> Boolean.

Sequence strings -> Integer.

Empty strings -> null (not empty string).

## 3. Hierarchical Assembly Algorithm

Initialize empty StudyDesign object.

Codelist Pass: Scan Codelists sheet. Group rows by Codelist ID.

Form Pass: Scan Forms sheet. Create map of Form OIDs.

Item Pass: Scan Items sheet.

Assign CrfItem to its formOid.

Automatically create a "Default Group" if Page is empty.

Attach Codelist reference if Variable Type is Codelist.

Event Pass: Scan Events sheet. Map Forms comma-separated string to an array of EventFormRef.

## 4. Script & Expression Capture

Show If: Capture as raw string (to be used in <ConditionDef> for ODM).

Derivation:

Capture Derivation as the expression logic.

Capture Dependencies to build dependency arrays for reactive EDC systems.

## 5. Source Row Tracking

Every object in the StudyDesign (Forms, Groups, Items) must include a non-exported property _sourceRowIndex. This is populated during the parse loop to enable the "Go to Source" feature in the UI.
