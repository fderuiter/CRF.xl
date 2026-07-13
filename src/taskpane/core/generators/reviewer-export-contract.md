# Reviewer Export Contract Specification

This document defines the technical contracts, rendering boundaries, and output packaging specifications for the CRF.xl clinical reviewer export system. It guarantees that generated annotated Case Report Forms (aCRFs) and review packages comply with regulatory submission standards (e.g., FDA and PMDA guidelines).

---

## 🎯 Export Pipeline Architecture

The reviewer export pipeline compiles the active workbook schema and user annotations into a verified reviewer package, executing in five chronological stages:

```text
[Excel Study Design Schema] + [User Clinical Annotations]
                            │
                            ▼
          [Preflight & Export Readiness Audits] (Validates bounds)
                            │
                            ▼
        [DOCX Layout Generation] (Compiles page-per-form layouts)
                            │
                            ▼
      [PDF/DOCX Rendering Service] (Applies visual overlays & bubbles)
                            │
                            ▼
   [Verification Manifest Generator] (Builds package manifest & locks)
```

---

## 📦 Export Readiness (Preflight Rules)

To ensure high data integrity, the export engine enforces preflight boundaries that block generation if critical issues are active:

* **Critical Errors (Blockers):** Export buttons are disabled if any critical validator flags are present (e.g., duplicate OIDs, missing codelists, circular dependency cycles).
* **Annotation Warnings (Non-blocking):** If orphaned annotations are present, the exporter prompts a confirmation dialog: `Warning: Orphaned annotations exist and will be excluded from the generated files. Proceed?`
* **Incomplete Metadata Warnings:** Missing SAS labels or SAS violating lengths raise warnings but do not block export.

---

## 🎨 Visual Render Specifications

Annotated CRFs (aCRFs) serve as the primary map for clinical database setups. The rendering builder (`docx-builder.ts`) must comply with the following visual standards:

### 1. Document Structure & Layout
* **Page-per-Form:** Every Form defined in `_Forms` maps to a distinct page, separated by physical "Page Break Before" markers.
* **Clinical Header Block:** Every page must render a standardized metadata header:
  * **Study Protocol ID** (extracted from workbook properties)
  * **Form OID & SAS Name**
  * **Subject Number & Event/Visit placeholders**
* **Affordances:** Standard visual components render input areas:
  * Checkboxes $\rightarrow$ Empty squares `[ ]`
  * Numeric inputs $\rightarrow$ Scored comb lines `| | | |`
  * Text inputs $\rightarrow$ Bounded boxes
  * Visual Analog Scales (VAS) $\rightarrow$ Horizontal lines with graduation marks

### 2. Annotation & Variable Bubble Overlays
Variables must carry visual callout "bubbles" mapped directly adjacent to their input controls:
* **Callout Bubble Colors:** Standard regulatory classifications apply:
  * **SDTM Variable Mappings:** Standard blue bubbles (`#1F77B4` HSL equivalent).
  * **Controlled Terminology Callouts:** Green bubbles (`#2CA02C` HSL equivalent).
  * **Logic / Show If Conditions:** Orange bubbles (`#FF7F0E` HSL equivalent).
* **Callout Text:** Printed in a highly legible, small sans-serif font (e.g., Arial 8pt) containing: `[Variable OID] (SAS_Name)`.

---

## 💾 Package Manifest & Verification

When the export operation is successfully completed, the engine generates a structured ZIP package containing the reviewer deliverables along with a **Verification Manifest** (`verification-manifest.json`):

### 1. Package File Contents
* `/[Protocol_ID]_Annotated_CRF.docx` (Word layout)
* `/[Protocol_ID]_Annotated_CRF.pdf` (Handwriting-ready print)
* `/[Protocol_ID]_ODM_Specification.xml` (CDISC compliant metadata)
* `/verification-manifest.json` (Traceability manifest)

### 2. Manifest Schema
The manifest locks the package contents, detailing files, hashes, and metadata for audit trails:

```json
{
  "protocolId": "STUDY-001",
  "generatedTimestamp": "2026-05-20T02:46:00Z",
  "exporterAppVersion": "2.4.0",
  "contents": [
    {
      "filePath": "STUDY-001_Annotated_CRF.pdf",
      "sha256": "8f3b2024b46a530ca417a8ef56e2278504ab6e2278504ab6e2278504ababcdef",
      "purpose": "Reviewer Portable Document Format"
    },
    {
      "filePath": "STUDY-001_ODM_Specification.xml",
      "sha256": "4b6e2278504ab6e2278504ab24b46a530ca417a8ef56e2278504ab6e227850ab",
      "purpose": "CDISC ODM 1.3.2 Specification File"
    }
  ],
  "auditSummary": {
    "formsCompiled": 12,
    "variablesCompiled": 184,
    "annotationsEmbedded": 56
  }
}
```
