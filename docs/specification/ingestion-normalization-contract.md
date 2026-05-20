# Ingestion & Normalization Contract Specification

This document defines the technical contracts, schema boundaries, and transformation rules for the CRF.xl clinical metadata ingestion and standards normalization system. It ensures that clinical standards imported from external registries (e.g., CDISC Library) or reverse-parsed workbooks map deterministically to the internal typing system.

---

## 🎯 Architectural Overview

The ingestion lane acts as the gateway between external data sources and the Excel workbook, following a strict multi-layer architecture:

```text
[External Registry / CDISC Library API] OR [Legacy Excel Workbook File]
                      │
                      ▼
        [Ingestion Service Adapters] (API / File Parsers)
                      │
                      ▼ (Normalizer Layer)
    [Clinical Metadata Normalizer Service] (Transforms to Typed Schema)
                      │
                      ▼ (Conflict & Diagnostics Map)
    [UI Taskpane Registry/Dictionary Sidecar] (Review and Validation)
                      │
                      ▼ (Write-back Operations)
         [Office.js Excel Write-back] (Table insertion)
```

---

## 📦 Ingestion Service Adapters

Service adapters are responsible for raw data extraction. They isolate raw network and parsing mechanics, returning structured intermediate representations.

### 1. CDISC Library API Client
* **Service Module:** `cdisc-api-service.ts`
* **Network boundaries:** HTTPS calls to CDISC Library standard endpoints (OAuth authentication, client rate limits, exponential backoff, and retry handling).
* **Payload structure:** JSON mapping raw CDISC standards (CDASH, SDTM, controlled terminology).

### 2. Reverse Workbook Parser
* **Service Module:** Planned under reverse-parsing tasks.
* **Extraction bounds:** Extracts schema structures from non-scaffolded or legacy clinical excel sheets, converting them into loose metadata trees.

---

## ⚙️ Ingestion Normalizer Rules

The Clinical Metadata Normalizer transforms loose intermediate representations into typed CRF.xl objects (`StudyDesign`, `CrfItem`, `Codelist`, `Schedule`).

### 1. Data Type Normalization
Loose data types from external sources must map strictly to the internal type system:

| External Value | Internal Type (`DataType`) |
| --- | --- |
| `text`, `string`, `char` | `text` |
| `integer`, `int`, `numeric` | `integer` |
| `float`, `decimal`, `double` | `float` |
| `date`, `datetime`, `time` | `date` |
| `codelist`, `lookup`, `choices` | `Codelist` |

### 2. Referential Alignment Rules
* **Duplicate Detection:** If a codelist ID being imported already exists in `_Codelists`, the normalizer must tag the import as a duplicate, requiring explicit user resolution via the dictionary sidecar.
* **Auto-Scaffolding Pages:** If an item group contains items without an assigned Page boundary, the normalizer must automatically associate them with a default section identifier ("Default Group") to prevent hierarchy corruption.
* **Numeric Boundary Enforcement:** Variable range bounds (e.g., Minimum and Maximum values) must coerce cleanly to numeric floats or integers. Failures in coercion must be raised as import warnings.

---

## 📊 Diagnostics & UI Preview Model

Before writing imported structures back to active Excel sheets, the Taskpane UI uses the **Ingestion Diagnostics Model** to preview modifications:

```typescript
interface IngestionDiagnostics {
  status: 'clean' | 'warnings' | 'conflicts';
  actionsCount: {
    addedItems: number;
    modifiedCodelists: number;
    duplicateWarnings: number;
  };
  details: Array<{
    sheet: string;
    location: string; // e.g., "ItemGroup: Demographic"
    severity: 'warning' | 'conflict';
    message: string;
    suggestedResolution: 'override' | 'rename' | 'ignore';
  }>;
}
```

---

## 📜 Provenance & Import Manifest

To maintain GxP trace compliance and satisfy regulatory auditing, every ingestion action must record an import provenance record, saved inside browser `localStorage` and serialized as a metadata comment on active sheets:

* **Source ID:** Origin URI (e.g., `cdisc-library/sdtm-2.0`).
* **Ingested By:** active user initials or corporate account name.
* **Timestamp:** Deterministic ISO timestamp of import.
* **Source Version:** Active standard release or source file hash.
