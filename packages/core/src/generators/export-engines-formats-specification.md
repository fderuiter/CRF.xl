# CRF.xl: Export Engines & Formats Specification

## 1. Word Document Generator (.docx)

### 1.1 Document Structure

Sectioning: New section (Page Break) for every CrfForm.

Headers: Protocol ID, Version, Form Name, Visit Name.

Footer: Page X of Y.

### 1.2 Layout Affordances

Text/Numeric: Renders a handwriting line ________________.

Codelist (Radio): Renders a vertical list of options with circles ○.

Codelist (Checkbox): Renders options with boxes □.

Combs: If Paper Layout is Comb, render boxed characters [ ][ ][ ].

### 1.3 Clinical Controls

Subject Header: "Subject ID: [ _ _ _ ]" must appear at the top of every form.

Signature: Every form must end with an Investigator Signature/Date block.

## 2. CDISC ODM XML Generator (.xml)

### 2.1 Standard Compliance

Target: CDISC ODM v1.3.2 Metadata.

FileType: Snapshot.

### 2.2 Schema Mapping

ItemDef: Includes DataType, SASFieldName, and Question/TranslatedText.

CodeList: Linked via CodeListRef. Includes CodeListItem/Decode.

Branching: Logic from Show If is exported as <ConditionDef> and linked via CollectionExceptionConditionOID.

SDTM Mapping: Export SAS Label and Domain.Variable inside <Alias> tags for EDC auto-mapping.

## 3. Serialization Rules

Date Formatting: ISO 8601 for timestamps.

XML Escaping: All labels must escape &, <, >, ".
