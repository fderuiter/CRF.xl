# QA & Testing Strategy Index

This directory documents the comprehensive verification and validation strategies for the CRF.xl Clinical Design Engine. Testing is divided into distinct suites to isolate TypeScript business logic, Office.js environment behaviors, performance regressions, and GxP compliance.

---

## 🎯 Verification Framework

Every code contribution is subjected to four levels of quality gates before it is merged into the `main` branch. Detailed test coverage and quality targets for each core module are defined in the **[Subsystem Quality Matrix](./subsystem-quality-matrix.md)**.

### 1. [Unit Testing](./unit.md)
* **Goal:** Verify logic transformations, type casting (e.g., cell values $\rightarrow$ typed booleans), and XML sanitization.
* **Scope:** Decentralized testing of core parsing algorithms, AST builders, and generators in isolation.

### 2. [Integration Testing](./integration.md)
* **Goal:** Ensure the taskpane React application communicates reliably with the active Microsoft Excel environment via `Office.js`.
* **Scope:** Testing sheet discovery, navigation controls ("Go to Source"), and workbook scaffolding.

### 3. [Operational Quality & Performance Benchmarking](./performance-benchmark-mega-study.md)
* **Goal:** Enforce performance targets on large workbook parsing and prevent UI thread freezes.
* **Scope:** Benchmarking against the canonical mega-study fixture under a strict budget of **<3 seconds**. See also the [Performance Fixtures Strategy](./operational-quality.md) for benchmark operations.

### 4. [User Acceptance Testing (UAT)](./uat-suite.md)
* **Goal:** Validate end-to-end design usability and biostatistics standard compliance.
* **Scope:** Testing end-to-end paper CRF generation and CDISC ODM schema verification.

---

## 💾 Test Fixture Inventory

Quality validation relies on two dedicated workbook fixtures located under the `/test` directory:

1. **CDISC Reference Study (`test/fixtures/reference-study/`):**
   * *Purpose:* Enforce deterministic serialization and compliance with CDISC ODM v1.3.2 schemas.
   * *Validation:* Validated on every build against the foundational ODM XSD schema.
2. **Mega-Study Benchmark (`test/fixtures/mega-study/`):**
   * *Purpose:* Verify processing performance and memory management under scale (500+ items).

---

## 🏛️ Standards Mappings

* For clinical vocabulary verification and CDISC Library API tests, see the [Clinical Standards Mappings](./clinical-standards.md).
* For DOCX and ODM XML export format contracts, see [Export Validation Rules](./export-validation.md).
