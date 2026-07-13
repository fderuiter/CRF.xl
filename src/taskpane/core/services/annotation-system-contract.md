# Annotation System Contract Specification

This document defines the technical contracts, schema structures, anchoring rules, and synchronization lifecycles for the CRF.xl clinical annotation system. Grounded in GxP documentation requirements, it details how user comments and annotations are persisted and synchronized across active Excel workbooks.

---

## 🎯 Architectural Overview

Clinical annotations are metadata overlays anchored to specific variables, forms, or schedules. Because Excel workbooks are modified dynamically by users (inserting rows, sorting sheets, renaming headers), the annotation engine applies a **hybrid anchoring** model to prevent annotation drift or loss.

---

## 📦 Annotation Entity Schema

Annotations are structured strongly-typed TypeScript models, stored inside browser `localStorage` as recovery snapshots and compiled directly into the workbook's hidden document properties:

```typescript
export interface ClinicalAnnotation {
  id: string; // Globally unique identifier (UUID)
  studyOid: string; // Links annotation to a specific clinical study
  target: {
    type: 'variable' | 'form' | 'event' | 'schedule';
    oid: string; // The target clinical identifier (e.g., Variable OID)
    sheetName: string; // The physical sheet name at target creation
    rowIndex: number; // The row number when the annotation was added
    columnName?: string; // Target column (if variable-specific)
  };
  content: {
    category: 'sdtm_mapping' | 'query' | 'instruction' | 'compliance_note';
    text: string; // The annotation content
    author: string; // User initials or corporate account ID
    timestamp: string; // ISO 8601 creation date
  };
  lifecycle: {
    status: 'draft' | 'under_review' | 'resolved';
    reviewedBy?: string;
    reviewedTimestamp?: string;
  };
  anchoringHash: string; // Multi-field hash (OID + SheetName + RowContent) used for drift verification
}
```

---

## ⚙️ Hybrid Anchoring & Sync Lifecycle

Excel sheet rows are highly mutable. Relying strictly on cell coordinates (e.g., `Items!B45`) results in misaligned annotations when rows are inserted or sorted.

### 1. The Anchoring Resolution Loop
To resolve target cells, the annotation engine performs a three-step search:

```text
Step 1: OID Search (Referential)
   └─ Scan target sheet for matching Variable OID (Column 'A')
   └─ Found? -> Select cell and update anchor RowIndex.
   └─ NOT Found? -> Proceed to Step 2.

Step 2: Content Hash Search (Logical Match)
   └─ Scan rows surrounding target RowIndex (+/- 50 rows)
   └─ Check if Row contents match anchoringHash
   └─ Found? -> Restore anchor link, update OID in annotation, raise drift notice.
   └─ NOT Found? -> Proceed to Step 3.

Step 3: Orphan Processing (Fallback)
   └─ Declare annotation ORPHANED.
   └─ Remove from sheet UI overlays.
   └─ Preserve entity in Registry with status "Orphaned" for repair actions.
```

### 2. Workbook Mutation Lifecycle
To prevent state desynchronization, the annotation sync engine (`annotation-service.ts`) executes a write-back loop between the React UI and the Excel environment:

```text
[React Annotation UI] ──(User Adds Annotation)──► [Service Write Operation]
                                                          │
                                                          ▼
[Excel Cell Comment] ◄──(Insert Visual Comment)── [Office.js Document Call]
                                                          │
                                                          ▼
[Recovery Snapshot] ◄───(Auto-save State)──────── [Browser LocalStorage]
```

---

## 🔄 Orphan & Repair Policy

If a variable or form is renamed or deleted, the corresponding annotation becomes an **Orphan**. The system handles orphans according to the following GxP traceability rules:

* **No Auto-Deletion:** Under no circumstances are orphaned annotations automatically deleted from storage.
* **Diagnostics Visibility:** Orphans are surfaced as Quality Warnings in the active taskpane log, showing: `Annotation [ID] has lost its variable anchor [OID]`.
* **Manual Re-Anchoring:** Users can select the orphaned annotation in the taskpane and click "Re-Anchor" to associate it with a renamed variable, automatically recalculating the logical hashes.
