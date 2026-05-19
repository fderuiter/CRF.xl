# Architecture Decision Record Index

This document tracks significant architectural decisions for CRF.xl. Each entry states the decision, its rationale, its current status, and the date it was recorded.

For new decisions, copy the template at the bottom of this file.

---

## ADR-001: React + TypeScript + Office.js as app platform

**Decision:** Build the CRF.xl taskpane as a React 18 / TypeScript application running inside Excel via the Office.js Add-in model.

**Rationale:**
- Office Add-ins are the only supported extensibility model for Excel Desktop and Excel for the Web with a single codebase.
- React provides a component model well-suited to the multi-view taskpane architecture (RegistryView, MatrixView, AuthoringView, DictionarySidecar).
- TypeScript enforces the strict type contract required for clinical metadata safety.

**Status:** Active
**Recorded:** 2024

---

## ADR-002: Excel workbook as source of truth for CRF metadata

**Decision:** CRF metadata (study design, forms, items, codelists, schedule) is authored and stored entirely in the active Excel workbook. The workbook is the canonical source of truth; the taskpane reads from and writes to it.

**Rationale:**
- Clinical data managers already work in Excel; no migration or training cost.
- Excel provides a free-form, auditable, version-controlled artifact that fits GxP workflows.
- The workbook can be shared, reviewed, and opened without the add-in installed.

**Constraints:**
- Parsing must be tolerant of manual edits and partial/malformed sheets.
- The taskpane cannot assume exclusive lock on the workbook.

**Status:** Active
**Recorded:** 2024

---

## ADR-003: CDISC ODM XML as canonical regulatory export format

**Decision:** ODM (Operational Data Model) XML is the primary machine-readable export target for regulatory submissions. DOCX is the primary human-readable export target.

**Rationale:**
- CDISC ODM is the FDA-accepted standard for electronic data submission metadata.
- Generating ODM directly from the workbook model eliminates manual transcription errors.
- DOCX generation satisfies the annotated CRF requirement for regulatory packages.

**Status:** Active
**Recorded:** 2024

---

## ADR-004: Modular core/ architecture (parser / generators / services / types)

**Decision:** All application logic lives under `src/taskpane/core/` organized into four subdirectories: `parser/`, `generators/`, `services/`, `types/`. React components under `components/` call only services and types; they do not call Office.js APIs directly.

**Rationale:**
- Separates UI rendering from clinical logic, enabling independent testing.
- Generators are pure functions over the `StudyDesign` type, enabling unit testing without Office.js.
- Services encapsulate all Office.js calls, isolating the API surface.

**Prior state:** Early prototype had flat `parser.ts`, `generator.ts`, `types.ts` files. These are superseded and retained only for backward compatibility during migration.

**Status:** Active
**Recorded:** 2025

---

## ADR-005: Multi-manifest deployment strategy (dev / staging / production)

**Decision:** Maintain three separate manifest files (`manifest.dev.xml`, `manifest.staging.xml`, `manifest.production.xml`) with environment-specific add-in URLs, validated by `scripts/validate-manifests.js`.

**Rationale:**
- Allows independent deployment to each environment without modifying the same file.
- Validation script enforces structural consistency across all three environments.
- Follows Microsoft's recommended Office Add-in deployment patterns for enterprise distribution.

**Status:** Active
**Recorded:** 2025

---

## ADR-006: localStorage recovery snapshots (metadata-only, 7-day expiry)

**Decision:** Store a recovery snapshot in browser localStorage on each successful parse. Snapshots contain: validation summary, parsed study summary (counts only), UI state, and snapshot timestamp. Raw workbook cell contents and credentials are explicitly excluded. Snapshots expire after 7 days.

**Rationale:**
- Excel for the Web taskpanes can be refreshed or closed unexpectedly; a recovery snapshot prevents complete loss of UI context.
- Storing only metadata (not raw data) avoids any GxP data custody concern.
- 7-day expiry prevents unbounded localStorage growth.

**Status:** Active
**Recorded:** 2025

---

## ADR-007: ExcelJS for workbook parsing

**Decision:** Use the `exceljs` library for reading workbook cell data rather than calling Office.js range APIs directly for bulk reads.

**Rationale:**
- ExcelJS reads the entire workbook file in a single pass, significantly faster than batched Office.js range reads for large workbooks.
- The `chunking-runtime.ts` module handles sheet-level chunking when memory limits apply.
- Office.js range APIs are retained for write operations and navigation.

**Status:** Active
**Recorded:** 2025

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
**Recorded:** [Year or YYYY-MM]
```

---

## Working rule

Record an ADR when:
- A technology or library is chosen over a real alternative
- A structural pattern is adopted that will constrain future work
- An existing decision is reversed or superseded
- A significant constraint is accepted (performance, compliance, platform)

Do not record ADRs for routine implementation choices that do not constrain the architecture.
