# Serialization Proofing (ODM Reference Study)

## Canonical inputs and outputs

- Reference workbook: `test/fixtures/reference-study/reference-study.xlsx`
- Expected deterministic ODM XML: `test/fixtures/reference-study/expected-odm.xml`
- ODM 1.3.2 schema: `test/fixtures/reference-study/cdisc-schema/cdisc-odm-1.3.2/ODM1-3-2-foundation.xsd`

## Test

Serialization proof test:

- `test/serialization/odm-builder.reference-study.test.ts`

The test:
1. Loads the canonical workbook fixture.
2. Validates fixture coverage requirements (forms, visits, repeating form, codelists, data types, derived placeholder, required/optional variables).
3. Generates ODM XML with a fixed clock (`2026-01-01T00:00:00.000Z`) to make output deterministic.
4. Compares generated XML to `expected-odm.xml`.
5. Validates XML against the committed ODM 1.3.2 XSD via `xmllint --schema`.

## Regenerate expected XML

```bash
UPDATE_ODM_FIXTURE=1 npm test -- test/serialization/odm-builder.reference-study.test.ts --runInBand
```

## Re-validate XML manually

```bash
xmllint --noout --schema test/fixtures/reference-study/cdisc-schema/cdisc-odm-1.3.2/ODM1-3-2-foundation.xsd test/fixtures/reference-study/expected-odm.xml
```
