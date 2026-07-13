# CRF.xl Platform Scope

This document defines the canonical purpose, core functional capabilities, boundaries, and product principles of the CRF.xl Clinical Design Engine. It replaces the legacy MVP specification and represents the mature, multi-stream roadmap of the system.

---

## 🎯 Platform Purpose

CRF.xl is an enterprise clinical metadata compiler and study design engine running inside Microsoft Excel. It acts as a single-source-of-truth authoring environment, allowing Data Managers to structure, validate, and compile clinical metadata into production-ready formats (CDISC ODM XML, Annotated DOCX/PDFs, and EDC specifications).

CRF.xl bridges the gap between tabular design and clinical database building by applying strict compilation logic and GxP compliance boundaries directly to workbook designs.

---

## 🛠️ Core Capability Areas (In Scope)

The platform is built around five major capability areas:

### 1. Structured Tabular Scaffolding
* **Scaffolder Engine:** Initializing workbook templates with protected metadata structures (`_Study`, `_Codelists`, `_Forms`, `_Schedule`, and form sheets) to enforce standard data entry.
* **Dropdown Validation Constraints:** Applying in-cell drop-downs dynamically using Office.js to prevent input errors (e.g., Variable Type, Required flag).

### 2. Hierarchical Parsing & Engine
* **Hierarchical Assembly:** Extracting Event $\rightarrow$ Form $\rightarrow$ ItemGroup $\rightarrow$ Item relationships deterministically.
* **Memory & Large-Workbook Support:** Managing workbook chunking runtimes to handle mega-studies (500+ items) without freezing Excel.
* **Source Tracking:** Recording sheet/row locations for every design entity to allow "Go to Source" navigation in the UI taskpane.

### 3. Clinical Validation & Rules Parsing
* **Advanced Logic Parsing:** Tokenizing and parsing complex `_Rules` parsing logic, cycle validation via Dependency DAGs, and syntax validation.
* **Referential Integrity Audits:** Automated rules enforcing that every referenced item or codelist exists and matches typing rules.
* **Diagnostics Registry:** Severity classification into Critical Errors (blocking export) and Warnings (quality/best-practice flags).

### 4. Regulatory & Multi-Surface Export
* **Paper CRF (DOCX/PDF):** Layout builder translating Excel structures into handwriting-optimized Word layouts with Investigator blocks, VAS, and combs.
* **CDISC ODM Export:** Deterministic XML serializer compliant with v1.3.2 schemas, generating SDTM aliases, range checks, and conditions.

### 5. Standards Ingestion & Terminology mapping
* **CDISC Library Integration:** Importing standards and controlled terminologies directly into Excel using the dictionary sidecar.

---

## 🚫 Explicitly Out of Scope

CRF.xl does not perform the following actions (by design):

* **Direct EDC Database Hosting:** CRF.xl generates exchange files (ODM) but is not a clinical database platform or EDC.
* **Custom Database Audit Trails:** Audit history for design files relies strictly on Microsoft 365 cloud version control, SharePoint document history, and RBAC to prevent duplication.
* **Bypassing the Compilation Loop:** Changes to clinical schemas must happen through workbook authoring, not by direct database override.

---

## 💎 Product Principles

1. **Zero Silent Loss:** Any export operation that drops clinical metadata (e.g., unrecognized formulas) must raise an explicit Warning or block the export.
2. **Types-First Ingestion:** External standards must map cleanly to internal TypeScript types (`StudyDesign`, `CrfItem`) before Excel write-back.
3. **Excel as a UI Layer:** Excel is treated as a presentation and input medium. All core transformation, validation, and generation rules are decoupled into the modular TypeScript engine.
