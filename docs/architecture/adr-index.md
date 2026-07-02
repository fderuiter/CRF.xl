# Architecture Decision Record Index

This document tracks significant architectural decisions for CRF.xl. Each entry states the decision, its rationale, its current status, and the date it was recorded.

## Index

### Platform & Deployment
| ID | Title | Status | Date | Owner |
|:---|:---|:---|:---|:---|
| [ADR-001](#adr-001-react--typescript--officejs-as-app-platform) | React + TypeScript + Office.js as app platform | Active | 2024 | stream:enterprise-hardening |
| [ADR-005](#adr-005-multi-manifest-deployment-strategy-dev--staging--production) | Multi-manifest deployment strategy | Active | 2025 | stream:enterprise-hardening |

### Core Architecture
| ID | Title | Status | Date | Owner |
|:---|:---|:---|:---|:---|
| [ADR-004](#adr-004-modular-core-architecture-parser--generators--services--types) | Modular core/ architecture | Active | 2025 | stream:audit-governance |

### Data & Parsing
| ID | Title | Status | Date | Owner |
|:---|:---|:---|:---|:---|
| [ADR-002](#adr-002-excel-workbook-as-source-of-truth-for-crf-metadata) | Excel workbook as source of truth | Active | 2024 | stream:core-metadata |
| [ADR-007](#adr-007-exceljs-for-workbook-parsing) | ExcelJS for workbook parsing | Active | 2025 | stream:core-metadata |

### Export & Standards
| ID | Title | Status | Date | Owner |
|:---|:---|:---|:---|:---|
| [ADR-003](#adr-003-cdisc-odm-xml-as-canonical-regulatory-export-format) | CDISC ODM XML as canonical export format | Active | 2024 | stream:core-metadata |

### UI & Persistence
| ID | Title | Status | Date | Owner |
|:---|:---|:---|:---|:---|
| [ADR-006](#adr-006-localstorage-recovery-snapshots-metadata-only-7-day-expiry) | localStorage recovery snapshots | Active | 2025 | stream:authoring-ux |

---

## ADR-001: React + TypeScript + Office.js as app platform

**Decision:** Build the CRF.xl taskpane as a React 18 / TypeScript application running inside Excel via the Office.js Add-in model.

**Rationale:**
- **Office Add-in ecosystem:** Provides a cross-platform (Desktop and Web) extensibility model with a single codebase.
- **Type safety:** TypeScript enforces a strict contract for clinical metadata, reducing runtime errors in high-consequence design operations.
- React provides a robust component model for multi-view taskpane architecture.

**Status:** Active
**Recorded:** 2024
**Owner:** stream:enterprise-hardening
**Related Issues:** #28

---

## ADR-002: Excel workbook as source of truth for CRF metadata

**Decision:** The Excel workbook is the canonical source of truth for CRF metadata.

**Rationale:**
- **CRF metadata stored and edited in Excel sheets:** Allows Data Managers to use familiar tools while maintaining an auditable, version-controlled artifact.
- Direct workbook authorship eliminates migration costs and enables offline review.

**Constraints:**
- Parsing must be tolerant of manual edits and partial/malformed sheets.

**Status:** Active
**Recorded:** 2024
**Owner:** stream:core-metadata
**Related Issues:** #53

---

## ADR-003: CDISC ODM XML as canonical regulatory export format

**Decision:** CDISC ODM XML is the primary machine-readable export target.

**Rationale:**
- **CDISC ODM XML for regulatory submissions:** ODM is the FDA-accepted standard for electronic metadata exchange.
- Automated generation from the workbook model eliminates manual transcription errors in submission packages.

**Status:** Active
**Recorded:** 2024
**Owner:** stream:core-metadata
**Related Issues:** #44, #56

---

## ADR-004: Modular core/ architecture (parser / generators / services / types)

**Decision:** Adopt a modular core/ architecture to separate clinical logic from UI.

**Rationale:**
- **Parser / generators / services / types separation:** Ensures that clinical engine logic can be tested independently of the React UI and Office.js environment.
- Enhances maintainability by isolating API-specific calls in the service layer.

**Status:** Active
**Recorded:** 2025
**Owner:** stream:audit-governance
**Related Issues:** #28

---

## ADR-005: Multi-manifest deployment strategy (dev / staging / production)

**Decision:** Maintain environment-specific manifest files.

**Rationale:**
- **Dev / staging / production manifests with validate-manifests.js:** Allows independent deployment URLs for each environment while ensuring structural consistency via automated validation.
- Facilitates enterprise distribution through standard Microsoft Office Add-in patterns.

**Status:** Active
**Recorded:** 2025
**Owner:** stream:enterprise-hardening
**Related Issues:** #68

---

## ADR-006: localStorage recovery snapshots (metadata-only, 7-day expiry)

**Decision:** Store metadata-only recovery snapshots in localStorage.

**Rationale:**
- **7-day expiry, metadata-only (no raw cell data):** Prevents data loss during browser refreshes without incurring GxP data custody risks associated with clinical data persistence.
- Recovery snapshots are strictly scoped to UI state and structural metadata.

**Status:** Active
**Recorded:** 2025
**Owner:** stream:authoring-ux
**Related Issues:** #68

---

## ADR-007: ExcelJS for workbook parsing

**Decision:** Use ExcelJS for bulk workbook parsing instead of Office.js range reads.

**Rationale:**
- **Chosen over Office.js range reads for performance on large workbooks:** ExcelJS reads the entire file in a single pass, avoiding the overhead of multiple network/context calls for large datasets.
- Includes support for memory-managed chunking for extremely large sheets.

**Status:** Active
**Recorded:** 2025
**Owner:** stream:core-metadata
**Related Issues:** #68

---

## Template for new ADRs

```markdown
## ADR-NNN: [Short title]

**Decision:** [One or two sentences describing the decision made.]

**Rationale:**
- [Reason 1]
- [Reason 2]

**Alternatives considered:** [Optional — what was not chosen and why]

**Constraints:** [Optional — what this decision constrains going forward]

**Prior state:** [Optional — what this supersedes]

**Status:** Active | Superseded by ADR-NNN | Deprecated
**Recorded:** [YYYY-MM-DD]
**Owner:** [stream:label]
**Related Issues:** [#issue, #issue]
**Supersedes:** [ADR-NNN or N/A]
**Superseded by:** [ADR-NNN or N/A]
```

---

## Working rule

Record an ADR when:
- A technology or library is chosen over a real alternative
- A structural pattern is adopted that will constrain future work
- An existing decision is reversed or superseded
- A significant constraint is accepted (performance, compliance, platform)

Do not record ADRs for routine implementation choices that do not constrain the architecture.
