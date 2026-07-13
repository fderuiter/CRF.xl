# Export & Serialization Specification

This document defines the technical contracts, schema rules, and deterministic verification procedures for all clinical export formats supported by CRF.xl. Grounded in clinical data standards, this specification guarantees compliance with regulatory EDC definitions and paper CRF rendering rules.

---

## 🎯 Architectural Principles

1. **Zero Silent Loss:** Any export operation that drops clinical metadata (e.g., stripping custom aliases or failing to serialize conditional logic) must raise an explicit Warning or block the export entirely if the severity is Critical.
2. **Deterministic Outputs:** Export engines must be pure and reproducible. The CDISC ODM generator utilizes a fixed epoch timestamp (`2026-01-01T00:00:00.000Z`) during unit testing to ensure output comparisons are exactly reproducible.
3. **Validation Preflight:** Before any serialization triggers, the parsed `StudyDesign` payload is processed through the clinical validator. Exports are disabled if any blocker validation rules (`VAL-01` to `VAL-03`) are triggered.

---

## 📦 CDISC ODM XML Serialization Contract

The CDISC ODM export engine (`odm-builder.ts`) must comply with the CDISC Operational Data Model v1.3.2 standard:

### 1. Structure Mappings
* **Metadata Hierarchy:** Tabular sheets must serialize into standard ODM elements:
  * Event rows $\rightarrow$ `<StudyEventDef>`
  * Form mappings $\rightarrow$ `<FormDef>`
  * Section/Page grouping $\rightarrow$ `<ItemGroupDef>`
  * Variable rows $\rightarrow$ `<ItemDef>`
* **OID Constraints:** All OID strings must be validated against the standard regex: `^[A-Za-z0-9._-]+$`. Any invalid characters must trigger validation errors.

### 2. Logic Mapping
* **`Show If` Logic:** Capture conditional logic as a raw string and compile it into compliance `<ConditionDef>` blocks, mapped to the corresponding `<FormRef>` or `<ItemGroupRef>` via `CollectionException` schemas.
* **`Derivation` Logic:** Map workbook cell derivations to CDISC `<MethodDef>` tags to describe calculated variables.

### 3. Standards Compliance
* **SDTM Mappings:** Alias fields in workbook variables must serialize into `<Alias Context="SDTM" Name="[AliasName]"/>` tags.
* **Controlled Terminology:** Workbook codelists must map to `<CodeList>` elements, ensuring referential integrity rules between variables and codelist tables.

---

## 💾 Test Proofing & Regression Gates

Deterministic output verification is enforced via active test suites in the codebase:

### 1. Canonical Reference Test
* **Test Module:** `test/serialization/odm-builder.reference-study.test.ts`
* **Test Fixture:** `test/fixtures/reference-study/reference-study.xlsx`
* **Expected Output:** `test/fixtures/reference-study/expected-odm.xml`

Every pull request runs this test to verify that changes to the parser or generator do not result in unintended output modifications.

### 2. Manual Fixture Regeneration
If a change to parser schemas or XML templates is intentionally introduced, the reference fixture must be updated utilizing the following target command:

```bash
UPDATE_ODM_FIXTURE=1 npm test -- test/serialization/odm-builder.reference-study.test.ts --runInBand
```

### 3. XML Schema Validation (XSD)
Committed XML fixtures are validated against the official CDISC ODM 1.3.2 schema. Manual validation can be verified utilizing `xmllint`:

```bash
xmllint --noout --schema test/fixtures/reference-study/cdisc-schema/cdisc-odm-1.3.2/ODM1-3-2-foundation.xsd test/fixtures/reference-study/expected-odm.xml
```
