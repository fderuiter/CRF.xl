# Regression Fixture Policy

This document defines the storage structures, maintenance rules, and change policies for the clinical test fixtures utilized in the CRF.xl verification suite. Test fixtures serve as immutable clinical baselines, ensuring that changes to parser heuristics, validators, or exporters do not silently break existing behaviors.

---

## 📁 Fixture Directory Inventory

All test fixtures must be stored exclusively in the `/test/fixtures/` directory of the repository. This directory serves as the sole, authoritative, and centralized repository for all clinical test assets and integration test baselines.

**Policy Note: Prohibited Local Fixtures**
Developers and QA engineers are explicitly forbidden from creating, committing, or using nested/local fixture folders inside core generator folders (specifically under `src/taskpane/core/generators/`). All legacy local fixture folders have been removed to prevent duplicate asset creation and developer confusion.

### 1. `test/fixtures/reference-study/`
* **Purpose:** The canonical clinical design baseline used to verify deterministic CDISC ODM XML serialization.
* **Coverage Requirements:** Must contain at least one instance of every standard clinical variable type, repeating forms, multi-visit schedule matrices, and nested codelist structures.

### 2. `test/fixtures/mega-study/`
* **Purpose:** The scalability baseline used to verify performance budgets and chunking runtimes.
* **Coverage Requirements:** Must contain 500+ items, 20+ forms, and complex multi-sheet reference logic.

### 3. `test/fixtures/cdisc-library/`
* **Purpose:** Offline API payloads simulating CDISC standards responses (CDASH, SDTM, controlled terminology) to mock CDISC fetcher tests.

### 4. `test/fixtures/display-blocks/`
* **Purpose:** Workbook fixtures specifically used to test the parsing and rendering of non-variable rows (e.g., instructions and separators).

---

## 🔒 Immutability & Modification Rules

Test fixtures are GxP-governed assets. Unintended modifications can result in false-positive test results or hide regressions:

1. **No Silent Changes:** Modifying a fixture workbook (e.g., `reference-study.xlsx`) directly inside a feature PR is prohibited unless the PR's explicit purpose is extending schema coverage.
2. **Deterministic Outputs:** Every fixture modification **must** update the corresponding expected serialized artifact in the same commit. For example, changing `reference-study.xlsx` requires updating `expected-odm.xml`.
3. **Commit Auditing:** Changes to test fixtures are highlighted during PR reviews. Reviewers must confirm that:
   - Changes do not reduce clinical coverage.
   - The corresponding test suite runs clean and outputs deterministic formats.

---

## 🔄 Fixture Update Procedures

When extending schema support (e.g., adding a new Excel column or supported variable type):

### Step 1: Modify the Fixture
Open the Excel fixture workbook in Excel, apply the necessary schema columns or values, and save the file back to the `/test/fixtures/` directory.

### Step 2: Regenerate the Expected XML
Run the deterministic builder update command to rebuild the serialized baseline:
```bash
UPDATE_ODM_FIXTURE=1 npm test -- test/serialization/odm-builder.reference-study.test.ts --runInBand
```

### Step 3: Verify with Schema Checks
Ensure the newly generated XML continues to comply with CDISC ODM v1.3.2 foundation schemas:
```bash
xmllint --noout --schema test/fixtures/reference-study/cdisc-schema/cdisc-odm-1.3.2/ODM1-3-2-foundation.xsd test/fixtures/reference-study/expected-odm.xml
```
