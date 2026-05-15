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

### 2.1 Serialization Proof Fixture & Evidence

Canonical input workbook: `fixtures/reference-study/reference-study.xlsx`

Official schema set used for validation:
- `fixtures/odm/cdisc-schema/cdisc-odm-1.3.2/ODM1-3-2-foundation.xsd`
- `fixtures/odm/cdisc-schema/core/xml.xsd`
- `fixtures/odm/cdisc-schema/core/xmldsig-core-schema.xsd`

Canonical generated ODM output: `fixtures/odm/reference-study.xml`

Proof test: `src/taskpane/core/generators/cdisc/__tests__/serialization-proof.test.ts`

The proof test:
1. Loads the canonical `.xlsx` study fixture.
2. Builds ODM XML through `generateOdmXml`.
3. Verifies generated XML against `fixtures/odm/reference-study.xml` (normalizing runtime timestamps).
4. Validates the produced XML against the official ODM 1.3.2 schema with `xmllint --schema`.

Regenerate fixture and re-validate:
- `UPDATE_ODM_FIXTURE=1 npm test -- src/taskpane/core/generators/cdisc/__tests__/serialization-proof.test.ts --runInBand`
- `xmllint --noout --schema fixtures/odm/cdisc-schema/cdisc-odm-1.3.2/ODM1-3-2-foundation.xsd fixtures/odm/reference-study.xml`

CI coverage:
- `.github/workflows/main.yml` installs `libxml2-utils` and runs `npm test`, so ODM schema validation is enforced in CI.
