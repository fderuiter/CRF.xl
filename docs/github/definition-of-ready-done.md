# Definition of Ready and Definition of Done

This document defines the explicit, checkable quality gates for CRF.xl issues.

---

## Definition of Ready (DoR)

An issue is **Ready** when it can be picked up for execution without ambiguity or pending blockers.

### General Criteria (Required for all types)
- [ ] Has all required taxonomy labels: `type:*`, `status:ready`, `priority:*`, `stream:*`, `area:*`
- [ ] Has exactly one milestone assigned
- [ ] All blocking dependencies identified (via dependency comments and body references)
- [ ] No unresolved design questions that would block implementation

### type:epic
- [ ] **Outcome** and **Exit Criteria** sections present
- [ ] **In Scope** and **Out of Scope** sections defined
- [ ] At least one decomposed child issue exists and is linked
- [ ] High-level implementation strategy is documented

### type:feature
- [ ] **Objective**, **Scope**, and **Acceptance Criteria** sections present
- [ ] **Out of Scope** section explicitly defines boundaries
- [ ] **Codebase Alignment** section names specific files or modules affected
- [ ] Acceptance criteria are binary-checkable (not vague)

### type:task
- [ ] **Objective** and **Deliverable** clearly stated
- [ ] **Scope** and **Acceptance Criteria** defined
- [ ] If technical, **Codebase Alignment** section included

### type:docs
- [ ] **Target File** path identified
- [ ] **Outline** or section headings specified
- [ ] **Acceptance Criteria** define what constitutes a complete document

---

## Definition of Done (DoD)

An issue is **Done** and may be closed when it meets all acceptance criteria and satisfies structural requirements.

### General Criteria (Required for all types)
- [ ] All acceptance criteria in the issue body are checked off
- [ ] PR is reviewed, CI is green, and merged to `main`
- [ ] If modifying core subsystems: adherence to the [Subsystem Quality Matrix](../qa-testing/subsystem-quality-matrix.md) verified
- [ ] If a new module was added: `docs/architecture/module-map.md` updated
- [ ] If the module map changed or implementation status updated: `docs/github/codebase-alignment.md` updated
- [ ] README or other docs updated if public behavior or architecture changed

### type:epic
- [ ] All mandatory child issues are closed
- [ ] Exit criteria in the epic body are fully satisfied
- [ ] Final architecture/implementation documented in relevant `docs/`

### type:feature
- [ ] Implementation matches all acceptance criteria
- [ ] Tests cover all new surface area (unit/integration/e2e)
- [ ] Documentation updated to reflect new capability
- [ ] Codebase alignment verified via `npm run docs:traceability`

### type:task
- [ ] Stated deliverable (script, config, design, etc.) exists and is verified
- [ ] Documentation updated if the task changed a process or environment

### type:docs
- [ ] Target file exists at the correct path and is fully populated
- [ ] Document is linked from the README or a parent governance/architecture file
- [ ] Content is verified for accuracy and technical alignment

### area:excel-integration
- [ ] Implementation satisfies all NFRs defined in `docs/qa-testing/excel-runtime-nfr.md`
- [ ] Degraded-mode behavior (e.g., cell-edit mode, standalone browser) is verified
- [ ] Office.js error handling matches the project's normalization strategy
