# Roadmap Operations

This document defines how the CRF.xl roadmap issue (#28) is maintained, structured, and used as a strategic navigation reference.

---

## The roadmap issue

Issue [#28](https://github.com/fderuiter/CRF.xl/issues/28) is the **single strategic dashboard** for CRF.xl delivery direction. Its title is:

> `[Roadmap] CRF.xl Strategic Delivery Dashboard`

It is the **single strategic master issue** for CRF.xl. It may contain **epics as top-level sub-issues**. Implementation-level child issues belong under epics rather than directly under #28. Do not add acceptance criteria or code/task-level sub-issues to it.

---

## Required body sections

The roadmap issue body must contain exactly these sections, in this order:

### 1. Status line
One sentence: `Status: Active` or `Status: [milestone] in execution`.

### 2. Purpose
Statement defining the roadmap as the master issue for milestones, epics, sequencing, and risks.

### 3. Milestone Sequence table
A table with columns: Milestone, Focus, Status. Status values: 🟡 In Progress, 🔵 Ready, ✅ Complete.

```markdown
| Milestone | Focus | Status |
|-----------|-------|--------|
| M6 — Enterprise Hardening & Deployment | ... | 🟡 In Progress |
```

Update the status column when a milestone enters or exits execution.

### 4. Epic Index
Group all open epics by stream. One stream heading per section. List each epic as `- #N Epic Title`.

### 5. Sequencing Decisions
Numbered list of explicit decisions about execution order that are not obvious from the milestone sequence alone. Example: "Enterprise hardening runs as near-term closure; provisioning is the only external dependency."

### 6. Blockers / Risk Register
A table with columns: Risk, Owner Issue, Status. Update as risks are resolved or discovered.

### 7. Governance References
Links to canonical documentation (Issue Governance, Roadmap Operations, DoR/DoD).

### 8. Out of Scope note
A single line: "Execution tracking, sub-issue structure, and individual acceptance criteria belong in epic and feature issues respectively."

---

## What does NOT belong in the roadmap issue

| Does not belong | Belongs instead in |
|-----------------|-------------------|
| Acceptance criteria | Feature/task issues |
| Feature/task sub-issues | Epic issues |
| Sprint planning | Milestone description or project board |
| Code review decisions | Pull requests |
| Implementation notes | Feature issues |

---

## Hierarchy: roadmap → milestone → epic → feature → task

```
[Roadmap] #28                   — strategic dashboard, one per repo
  └─ Milestone M1–M7            — execution queue; issues are assigned here
       └─ [Epic] #N             — delivery container for a stream of related features
            └─ Feature #N       — implementable unit with acceptance criteria
                 └─ Task #N     — sub-unit of a feature, if needed
```

---

---

## Maintenance Policy & Update Cadence

The roadmap is the authoritative strategic reference. It must be updated during the weekly backlog review when:

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
