# CRF.xl: Export Validation Suite

## 1. Word (.docx) Layout Validation

Objective: Ensure the physical CRF is site-ready and logically structured.

### 1.1 Physical Affordances

Comb Format: Verify that items with PaperLayoutFormat.COMB render with character boxes [ ][ ][ ].

Checkbox Layout: Ensure DataType.BOOLEAN renders as two checkboxes (Yes/No) unless a codelist is specified.

VAS Scale: Verify PaperLayoutFormat.VAS renders a 10cm line with start/end labels.

### 1.2 Layout Logic

Page Breaks: Verify that each new CrfForm starts on a new page.

Headers/Footers: Ensure Protocol ID and Version appear in the header of every page.

Signature Blocks: Verify that forms with SignatureMeaning render a signature and date line at the end.

## 2. CDISC ODM (.xml) Validation

Objective: Ensure technical validity of the XML output.

XSD Validation: Generated XML must pass validation against the official CDISC ODM1-3-2.xsd.

Condition Logic: Verify that showIf logic is exported as <ConditionDef> and correctly referenced via CollectionExceptionConditionOID.

Character Encoding: Ensure UTF-8 encoding and that special characters are escaped (e.g., & as &amp;).
