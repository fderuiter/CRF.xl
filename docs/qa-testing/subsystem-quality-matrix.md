# End-to-End Quality Matrix by Subsystem

This document defines the required test coverage and quality evidence for each major subsystem in CRF.xl. Adherence to this matrix is a prerequisite for release-ready status.

## 1. Technical Coverage Matrix

This table defines the technical testing requirements for the core subsystems.

| Subsystem | Module | Unit Target | Integration Req. | Fixtures | Key Edge Cases |
| :--- | :--- | :---: | :---: | :--- | :--- |
| **Parser** | `core/parser/excel-parser.ts` | 90% | Yes (Office.js) | Mega-study, Reference | Merged cells, hidden sheets, 50k+ rows, aborted sync. |
| **Validator** | `core/parser/validator.ts` | 95% | No | Reference study | Circular deps, invalid expressions, cross-form reachability. |
| **Standards Import** | `core/services/cdisc-api-service.ts` | 80% | Yes (Mock API) | CDISC fixtures | API timeouts, malformed JSON, version mismatches. |
| **Dictionary Write-back**| `core/services/dictionary-service.ts` | 85% | Yes (Excel) | Reference study | Read-only cells, protected sheets, duplicate keys. |
| **ODM Export** | `core/generators/cdisc/odm-builder.ts` | 100% | No | Reference study | Special chars in XML, empty forms, vendor extensions. |
| **DOCX Export** | `core/generators/docx/docx-builder.ts` | 90% | No | Reference study | Large tables, image embedding, page break logic. |
| **Recovery Snapshot** | `core/services/recovery-storage.ts` | 95% | Yes (localStorage) | N/A | Storage quota exceeded, partial state corruption. |
| **Version Notification** | `core/services/version-update-service.ts`| 80% | Yes (UI) | N/A | Concurrent updates, user dismissal, offline mode. |

---

## 2. Quality Governance Matrix

This matrix maps subsystem categories to quality dimensions. Each cell defines the **[Owner \| Evidence \| Timing \| Severity]**.

### Legend
- **Owner**: Responsible role (Dev, QA, Lead).
- **Evidence**: Required artifact (Test report, Benchmark, Audit).
- **Timing**: When check is performed (PR, Milestone, Release).
- **Severity**: Impact if unmet (Blocker, Major, Minor).

| Subsystem Category | Correctness | Resilience | Performance | Compliance (GxP) |
| :--- | :--- | :--- | :--- | :--- |
| **Core Schema** | Dev \| Unit Tests \| PR \| **Blocker** | Dev \| Schema Val \| PR \| **Blocker** | Lead \| Benchmark \| Milestone \| Major | Lead \| Traceability \| Release \| **Blocker** |
| **Validation Rules** | Dev \| Logic Tests \| PR \| **Blocker** | Dev \| Edge Case Tests \| PR \| Major | Dev \| Runtime Prof \| Milestone \| Major | QA \| Rule Audit \| Release \| Major |
| **Excel Integration** | Dev \| Int. Tests \| PR \| **Blocker** | Dev \| Error Handlers \| PR \| Major | Lead \| Mega-study \| Milestone \| Major | QA \| Data Integrity \| Release \| **Blocker** |
| **Authoring UX** | QA \| Manual UAT \| Release \| Major | Dev \| UI Fallbacks \| PR \| Minor | QA \| Frame Rate \| Milestone \| Minor | QA \| Accessibility \| Release \| Major |
| **Ingestion / Export** | Dev \| Fixture Diff \| PR \| **Blocker** | Dev \| Format Val \| PR \| Major | Lead \| Batch Benchmark \| Milestone \| Major | QA \| Export Audit \| Release \| **Blocker** |
| **Security / Governance**| Lead \| Sec. Audit \| Release \| **Blocker** | Dev \| Auth Tests \| PR \| **Blocker** | N/A | Lead \| Compliance Doc \| Release \| **Blocker** |

---

## 3. Mega-Study Performance Acceptance Targets

The `mega-study` fixture (`test/fixtures/mega-study/mega-study-v1.xlsx`) is the authoritative scale benchmark.

| Subsystem | Metric | Target | Severity |
| :--- | :--- | :--- | :--- |
| **Parser** | Cold Parse (2000+ items) | < 3000ms | **Blocker** |
| **Parser** | Taskpane Blocking Time | < 1000ms | Major |
| **Validator**| Total Validation Time | < 500ms | Major |
| **General** | Peak Memory Usage (RSS) | < 1024MB | Major |

*Verification Command:* `npm run benchmark:mega-study`

---

## 4. Release Signoff Requirements

Before any major release, the following must be verified:
1. All **Blocker** severity cells in the Governance Matrix have 100% passing evidence.
2. Unit coverage for core subsystems meets or exceeds targets in the Technical Matrix.
3. Mega-study benchmark results are within 10% of targets.
4. All acceptance criteria from the [Definition of Done](../github/definition-of-ready-done.md) are met.

*Note: This matrix relates to release signoff checklist requirements (#154).*
