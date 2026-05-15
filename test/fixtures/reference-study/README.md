# Reference Study Fixture

This fixture is the canonical input for ODM serialization proofing.

- Workbook: `reference-study.xlsx`
- Expected deterministic ODM output: `expected-odm.xml`
- CDISC ODM 1.3.2 schema: `cdisc-schema/`

The workbook covers:
- Forms: Demographics, Vital Signs, Adverse Events
- Visits: Screening, Baseline
- Repeating form: Adverse Events
- Codelists: Yes/No and Severity
- Variable types: text, integer, float, date, codelist-mapped
- Numeric metadata placeholder columns: Length + Precision
- Derived placeholder rows (`Origin = Derived`)
- Required and optional variables
