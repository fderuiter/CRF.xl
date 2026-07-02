# Roadmap Operations

This document defines how the CRF.xl roadmap issue (#28) is maintained, structured, and used as a strategic navigation reference.

---

## The roadmap issue

Issue #28 is the **single strategic dashboard** for CRF.xl delivery direction. Its title is:

> `[Roadmap] CRF.xl Strategic Delivery Dashboard`

It is the **single strategic master issue** for CRF.xl. It may contain **epics as top-level sub-issues**. Implementation-level child issues belong under epics rather than directly under #28. Do not add acceptance criteria or code/task-level sub-issues to it.

---

## Required body sections

The roadmap issue body must contain exactly these sections, in this order:

### 1. Status line
One sentence: `Status: Active` or `Status: [milestone] in execution`.

### 2. Milestone Sequence table
A table with columns: Milestone, Focus, Status. Status values: 🟡 In Progress, 🔵 Ready, ✅ Complete.

Update the status column when a milestone enters or exits execution.

### 3. Epic Index
Group all open epics by stream. One stream heading per section. List each epic as `- #N Epic Title`.

### 4. Sequencing Decisions
Numbered list of explicit decisions about execution order that are not obvious from the milestone sequence alone.

### 5. Blockers / Risk Register
A table with columns: Risk, Owner Issue, Status. Update as risks are resolved or discovered.

### 6. Governance References
Links to key governance documents.

### 7. Out of Scope note
A single line: "Execution tracking, sub-issue structure, and individual acceptance criteria belong in epic and feature issues respectively."

---

## Boundary definitions

| Level | Purpose | Content |
|-------|---------|---------|
| **Roadmap (#28)** | Strategic navigation & dashboard | Milestone sequence, epic list, risks, high-level decisions. **No implementation details.** |
| **Milestone** | Execution queue & review bucket | Logical grouping of issues for a specific delivery target. Defined in `milestones.md`. |
| **Epic** | Delivery container | Groups features/tasks for a capability. Owns implementation-level work. |
| **Feature** | Implementable unit | Functional capability with specific acceptance criteria. |
| **Task** | Concrete scoped work | Non-feature artifact or specific implementation sub-unit. |

---

## Update cadence

Update the roadmap issue during the weekly backlog review when:

- A milestone changes status (enters execution, completes)
- A new epic is added to a stream
- A sequencing decision changes
- A risk is resolved or a new risk is identified
- An epic is closed or superseded

Routine label changes, new feature issues, and PR merges do not require a roadmap update.

---

## How to record a sequencing decision change

1. Update the Sequencing Decisions section in #28.
2. Post a comment on #28 briefly explaining the change and why.
3. If the change has a material impact on any blocked issue, update the dependency comment on that issue too (see `docs/github/dependency-management.md`).

---

## Risk register update policy

The Risk Register in #28 is the authoritative list of strategic delivery risks.

1. **Discovery:** When a risk is identified that could impact milestone delivery or cross-stream execution, it must be added to the register.
2. **Ownership:** Every risk must be associated with an "Owner Issue" (usually a Spike or Governance issue) where the mitigation is tracked.
3. **Status:**
   - `Open`: Risk is active and mitigation is pending.
   - `Mitigated`: Controls are in place to reduce impact/likelihood.
   - `Resolved`: Risk no longer exists.
4. **Promotion:** If a feature-level risk (labeled `risk:*`) is determined to have strategic impact, it should be promoted to the roadmap risk register.

---

## Roadmap body template

Copy and paste this template when initializing or rebuilding the roadmap issue body.

```markdown
# [Roadmap] CRF.xl Strategic Delivery Dashboard

## Status
Status: Active

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
| M1 — Core Metadata Foundations | schema, validation, rule plumbing | 🔵 Ready |
| M2 — Standards Import & Reverse Ingestion | standards import, reverse parsing | 🔵 Ready |
| M3 — Metadata Diff & Comparison | diff engine, baseline ingestion | 🔵 Ready |
| M4 — Authoring UX & Internationalization | authoring-side UX | 🔵 Ready |
| M5 — Reviewer Export & aCRF | reviewer workflow and export rendering | 🔵 Ready |
| M6 — Enterprise Hardening & Deployment | manifests, deployment | 🟡 In Progress |
| M7 — Audit & Governance | provenance, backlog governance | 🔵 Ready |

Status legend:
- 🟡 In Progress
- 🔵 Ready
- ✅ Complete

---

## Epic Index

### stream:core-metadata
- #N [Epic] <title>

### stream:ingestion-migration
- #N [Epic] <title>

### stream:authoring-ux
- #N [Epic] <title>

### stream:reviewer-export
- #N [Epic] <title>

### stream:enterprise-hardening
- #N [Epic] <title>

### stream:audit-governance
- #N [Epic] <title>

---

## Sequencing Decisions

1. [Fill in explicit cross-epic sequencing decisions]

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
```
