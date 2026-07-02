# Update to #28 [Roadmap] CRF.xl Strategic Delivery Dashboard

## Status
Status: M5 — Reviewer Export & aCRF in execution

## Purpose
This is the single master roadmap issue for CRF.xl.

It tracks:
- milestone progression,
- active epics (as direct sub-issues),
- cross-epic sequencing decisions,
- major blockers and delivery risks,
- governance and backlog-health control work.

---

## Milestone Sequence

| Milestone | Focus | Status |
|-----------|-------|--------|
| M1 — Core Metadata Foundations | schema, validation, rule plumbing | ✅ Complete |
| M2 — Standards Import & Reverse Ingestion | standards import, reverse parsing | ✅ Complete |
| M3 — Metadata Diff & Comparison | diff engine, baseline ingestion | ✅ Complete |
| M4 — Authoring UX & Internationalization | authoring-side UX | ✅ Complete |
| M5 — Reviewer Export & aCRF | reviewer workflow and export rendering | 🟡 In Progress |
| M6 — Enterprise Hardening & Deployment | manifests, deployment | 🔵 Ready |
| M7 — Audit & Governance | provenance, backlog governance | 🔵 Ready |

Status legend:
- 🟡 In Progress
- 🔵 Ready
- ✅ Complete

---

## Epic Index

### stream:core-metadata
- ✅ #53 [Epic] Advanced Logic & Dynamic Branching — (Foundations #88, #137, #138 Complete)
- ✅ #42 [Epic] Structural Guardrails

### stream:ingestion-migration
- ✅ #76 [Epic] Ingestion & Migration Wizards
- 🔵 #91 [Feature] Migration Import Strategy — (Pipeline implemented)

### stream:authoring-ux
- ✅ #35 [Epic] Fluent UI v9 Migration — (Completed: 0 legacy imports found)
- ✅ #39 [Epic] Multi-Language Dictionary Support (eCOA)
- ✅ #83 [Feature] Intelligent Dictionary Sidecar

### stream:reviewer-export
- 🟡 #56 [Epic] Reviewer-Ready Exports & User Enablement
- 🔵 #90 [Feature] aCRF PDF Rendering Architecture — (Implemented in pdf-builder.ts)

### stream:enterprise-hardening
- [Empty]

### stream:audit-governance
- [Empty]

---

## Sequencing Decisions

1. #138 (DAG Topological Sort) is now resolved and integrated into the validator.
2. #35 is closed; all new UI work must use Fluent UI v9.

---

## Blockers / Risk Register

| Risk / Blocker | Owner Issue | Status | Notes |
|----------------|------------|--------|-------|
| [risk description] | #N | Open | [notes] |

---

## Governance References

- `docs/github/issue-governance.md`
- `docs/github/roadmap-operations.md`
- `docs/github/definition-of-ready-done.md`
- `docs/github/dependency-management.md`

---

## Out of Scope

Execution tracking, feature acceptance criteria, implementation notes, and sub-task details belong in epic and child issues, not in this master issue.
