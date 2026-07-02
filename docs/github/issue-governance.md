# CRF.xl Issue Governance Playbook

This document defines the canonical issue model, hierarchy, templates, labeling standards, and backlog operating rules for CRF.xl.

The goal is to ensure that:
- every issue is written consistently,
- issue automation can operate predictably,
- epics and features are decomposed to the right level,
- the roadmap is navigable from one master issue,
- dependencies and blockers are explicit rather than implied.

---

## 1. Canonical hierarchy

CRF.xl uses the following issue hierarchy:

```text
[Roadmap] / Master Issue (#28)
  └─ [Epic]
       └─ [Feature] / [Task] / [Docs] / [Governance] / [Spike] / [Bug] / [Refactor]
            └─ optional sub-task or implementation child
```

### Rules

- There is exactly **one master roadmap issue** in the repo: `#28`.
- The master issue owns **epics only**.
- Epics own implementation-level work.
- Features may have sub-tasks only when the feature is still too large to complete in one tightly scoped delivery effort.
- Labels classify issues; **GitHub sub-issues encode hierarchy**.

---

## 2. Required issue design principles

Every issue must satisfy these rules:

1. **Single purpose** — one issue represents one coherent outcome.
2. **Correct level** — containers for multiple deliverables are epics; directly implementable work is feature/task/docs/etc.
3. **Checkable completion** — every issue must have acceptance criteria that can be verified.
4. **Explicit parentage** — every non-roadmap issue must have a parent decision: either an epic under #28, a child of an epic, or intentionally standalone governance work explicitly referenced from #28.
5. **Explicit dependencies** — if blocked, the issue must name the blocking issue in both a GitHub dependency relationship and the issue body `Dependencies` section.

---

## 3. Required labels

Every active issue must carry exactly:

- **one** `type:*`
- **one** `status:*`
- **one** `priority:*`
- **one** `stream:*`
- **one or two** `area:*`

Optional labels:
- `risk:*`
- `relation:*` only as supplemental metadata during migration, not as primary structure

---

## 4. Type taxonomy

| Label | Meaning |
|-------|---------|
| `type:roadmap` | The single master roadmap issue (#28) |
| `type:epic` | A delivery container for a capability area |
| `type:feature` | A directly implementable functional capability |
| `type:task` | A scoped work item producing a concrete non-feature artifact or implementation unit |
| `type:docs` | Documentation creation or revision |
| `type:governance` | Backlog/process/structure/policy work |
| `type:spike` | Time-boxed investigation with a required output |
| `type:bug` | Correction of incorrect existing behavior |
| `type:refactor` | Restructuring without intended behavior change |

### CRF.xl-specific guidance
- Use `type:task` for design checklists, dependency graphs, signoff checklists, mapping specs, and operational artifacts.
- Use `type:docs` only when the primary deliverable is a documentation file.
- Use `type:governance` for milestone cleanup, taxonomy cleanup, roadmap maintenance, issue normalization, and process audits.
- Do **not** use `[QA]` in titles. QA-focused work should use `type:task`.

---

## 5. Status taxonomy

| Label | Meaning |
|-------|---------|
| `status:needs-triage` | New and not yet reviewed |
| `status:needs-design` | Scope is accepted but design/decomposition is incomplete |
| `status:needs-acceptance-criteria` | Design exists but completion rules are not yet usable |
| `status:ready` | Ready to execute |
| `status:in-progress` | Actively worked |
| `status:verify` | Implemented, awaiting verification |
| `status:blocked` | Cannot proceed because of a dependency |
| `status:needs-more-information` | Missing stakeholder or author clarification |

### Status rules
- `status:ready` means the issue meets Definition of Ready.
- `status:blocked` requires a named blocker.
- `status:in-progress` should only be used for issues with active work, not just intent to work.
- Epics may remain `status:needs-design` until their child issue map is sufficiently decomposed.

---

## 6. Priority taxonomy

| Label | Meaning |
|-------|---------|
| `priority:p0` | Critical path / blocking / urgent governance or delivery prerequisite |
| `priority:p1` | Important current milestone work |
| `priority:p2` | Planned but not immediate |
| `priority:p3` | Deferred / lower urgency |

---

## 7. Stream taxonomy

| Label | Scope |
|-------|-------|
| `stream:core-metadata` | Parser, validator, types, rule AST, diff engine, ODM/DOCX export |
| `stream:ingestion-migration` | CDISC API, reverse parsing, terminology import, migration wizards |
| `stream:authoring-ux` | Authoring views, dictionary sidecar, annotations, internationalization |
| `stream:reviewer-export` | Reviewer workflow, PDF/DOCX export rendering, aCRF generation |
| `stream:enterprise-hardening` | Manifests, deployment, CI enforcement, security, release hardening |
| `stream:audit-governance` | Audit trail, change-control compliance, backlog governance, architecture docs |

### Stream rule
A stream answers: **which delivery lane owns this work?** If an issue crosses areas, the stream still names the primary owning lane.

---

## 8. Area taxonomy

| Label | Scope |
|-------|-------|
| `area:core-schema` | Type definitions, OID model, clinical metadata contract |
| `area:validation-rules` | Validator, rule AST, dependency graph, logic engine |
| `area:excel-integration` | Office.js API calls, workbook read/write, sheet management |
| `area:import-export` | ODM, DOCX, reverse parsing, ingestion |
| `area:cdisc-standards` | CDISC Library API, controlled terminology, ODM structure |
| `area:ui-ux` | React components, views, taskpane layout |
| `area:reviewer-exports` | Annotated CRF, PDF rendering, review mode output |
| `area:internationalization` | Locale-aware parsing, translation UI, multi-language support |
| `area:devops` | CI/CD, manifests, deployment, scripts |
| `area:security-compliance` | GxP compliance, 21 CFR Part 11, RBAC, audit trail |
| `area:audit-trail` | Audit log, change history, provenance trail |
| `area:performance` | Parse speed, memory, Excel runtime performance |
| `area:state-management` | Recovery snapshots, UI state, workbook sync state |

### Area rule
- One area = preferred for most issues
- Two areas = allowed when the issue genuinely spans two primary surfaces
- More than two areas usually means the issue is too broad

---

## 9. Risk labels (supplemental)

| Label | Indicates |
|-------|-----------|
| `risk:excel-runtime` | Issue involves Office.js behavior that has known runtime risk. See [Office.js Runtime Risk Register](../architecture/office-runtime-risk-register.md) |
| `risk:clinical-validation` | Issue affects clinical data validation logic |
| `risk:compliance` | Issue touches GxP or regulatory compliance surface |
| `risk:data-loss` | Issue involves operations that could cause data loss |
| `risk:performance` | Issue has a performance risk at scale |

---

## 10. Relation labels (supplemental — migration use only)

| Label | Indicates |
|-------|-----------|
| `relation:child-of-epic` | Issue is a child of a parent epic (must also be encoded as GitHub sub-issue) |
| `relation:blocked-by-epic` | Issue is pending resolution of a parent epic decision |
| `relation:duplicate-candidate` | May be a duplicate; pending review |
| `relation:superseded` | Replaced by another issue |

`relation:*` labels are supplemental only. They may help migration and reporting, but must not be the sole expression of hierarchy. After GitHub sub-issue migration is complete, retire `relation:child-of-epic` from active use.

---

## 11. The master issue (#28)

`#28 [Roadmap] CRF.xl Strategic Delivery Dashboard` is the single top-level master issue.

**#28 is the strategic master and may contain epics as top-level sub-issues. Implementation-level child issues belong under epics, not directly under #28.**

It should contain:
- milestone status overview
- active epic index by stream
- sequencing decisions
- blockers/risk register
- governance references

It should **not** contain implementation-level acceptance criteria or code/task-level sub-issues.

See `docs/github/roadmap-operations.md` for the maintenance protocol and body template for #28.

### Allowed direct children of #28
- open epics
- major governance tracking issues that are roadmap-level controls

### Not allowed directly under #28
- feature issues, task issues, docs tickets tied to a specific epic, engineering subtasks

---

## 12. Epic rules

An issue must be an epic if it:
- groups multiple deliverables,
- spans multiple child issues,
- requires staged delivery,
- acts as a capability container rather than an implementation item.

An epic is not `status:ready` unless it has at least one decomposed child issue and a credible child plan.

---

## 13. Feature rules

A feature should represent one implementable product or system capability.

Split a feature when it:
- spans more than one subsystem,
- combines engine + UI + docs + validation in one ticket,
- would likely need multiple PRs,
- has multiple distinct deliverables,
- has broad "platform" language rather than narrow scope.

---

## 14. Standard title formats

| Type | Format |
|------|--------|
| Roadmap | `[Roadmap] CRF.xl Strategic Delivery Dashboard` |
| Epic | `[Epic] <capability>` |
| Feature | `[Feature] <implementable capability>` |
| Task | `[Task] <concrete scoped work>` |
| Docs | `[Docs] <document or documentation change>` |
| Governance | `[Governance] <backlog/process change>` |
| Spike | `[Spike] <question or investigation>` |
| Bug | `[Bug] <broken behavior>` |
| Refactor | `[Refactor] <structural code change>` |

Do **not** use: plain unprefixed titles, `Feature:` colon-style, mixed bracket-and-colon styles, or `[QA]`.

---

## 15. Standard body sections by issue type

### Epic
- Outcome
- In Scope / Out of Scope
- Child Issues
- Dependencies
- Exit Criteria

### Feature
- Parent Epic
- Objective
- Scope
- Acceptance Criteria
- Dependencies
- Out of Scope
- Codebase Alignment

### Task
- Parent
- Objective
- Deliverable
- Scope / Acceptance Criteria
- Dependencies / Out of Scope

### Docs
- Parent
- Objective
- Target File
- Outline
- Acceptance Criteria
- References

### Governance
- Objective
- Current State / Target State
- Scope
- Acceptance Criteria
- Verification Steps

### Spike
- Question
- Why This Matters
- Investigation Scope
- Deliverable
- Exit Criteria

---

## 16. Issue body templates

### Epic body template

```markdown
# [Epic] <Title>

**Parent:** #28 [Roadmap] CRF.xl Strategic Delivery Dashboard
**Stream:** <stream label>
**Milestone:** <milestone>

## Outcome
<State the business/product/technical outcome this epic delivers.>

## In Scope
- <item>

## Out of Scope
- <item>

## Child Issues
- #<n> <title>

## Dependencies
- <issue or external dependency>

## Exit Criteria
- [ ] All intended child issues are created and linked
- [ ] All child issues required for the epic outcome are complete
- [ ] Epic outcome is demonstrably delivered
- [ ] Any required docs are updated
```

### Feature body template

```markdown
# [Feature] <Title>

**Parent Epic:** #<n> <epic title>
**Stream:** <stream label>
**Milestone:** <milestone>

## Objective
<State the single implementable outcome of this feature and why it matters.>

## Scope
- <in-scope item>

## Acceptance Criteria
- [ ] <binary-checkable criterion>

## Dependencies
- <issue reference or "None currently identified">

## Out of Scope
- <explicit exclusion>

## Codebase Alignment
| Module / File | Change Type | Notes |
|---------------|-------------|-------|
| `src/...` | New / Modify / Read | <notes> |
```

### Task body template

```markdown
# [Task] <Title>

**Parent:** #<n> <parent issue title>
**Stream:** <stream label>
**Milestone:** <milestone>

## Objective
<State the concrete outcome.>

## Deliverable
<State exactly what artifact, mapping, checklist, design, or implementation output will exist when this is done.>

## Scope
- <item>

## Acceptance Criteria
- [ ] <binary-checkable criterion>

## Dependencies
- <issue reference or none>

## Out of Scope
- <item>
```

### Docs body template

```markdown
# [Docs] <Title>

**Parent:** #<n> <parent issue title, if applicable>
**Stream:** <stream label>
**Milestone:** <milestone>

## Objective
<State what documentation gap is being closed.>

## Target File
- `docs/...`

## Outline
- <section heading>

## Acceptance Criteria
- [ ] Target file exists or is updated at the specified path
- [ ] Content reflects the current CRF.xl workflow or architecture accurately
- [ ] Related issues/docs are linked

## References
- #<n>
```

### Governance body template

```markdown
# [Governance] <Title>

**Parent:** #28 [Roadmap] CRF.xl Strategic Delivery Dashboard
**Stream:** stream:audit-governance
**Milestone:** <milestone>

## Objective
<State the governance problem being fixed and the intended normalized state.>

## Current State
<Describe the inconsistency, drift, or process gap.>

## Target State
<Describe the desired normalized state.>

## Scope
- <item>

## Acceptance Criteria
- [ ] <verification criterion>

## Verification Steps
1. <step>

## Out of Scope
- <item>
```

### Spike body template

```markdown
# [Spike] <Title>

**Parent:** #<n> <parent issue title, if applicable>
**Stream:** <stream label>
**Milestone:** <milestone>

## Question
<What decision or uncertainty is this spike meant to resolve?>

## Why This Matters
<Why is the answer needed for CRF.xl delivery?>

## Investigation Scope
- <item>

## Deliverable
<State the decision artifact, memo, doc, comparison, or recommendation that must be produced.>

## Exit Criteria
- [ ] Research findings are documented
- [ ] Recommendation is explicit
- [ ] Next-step issue(s) can be created or updated from the findings
```

---

## 17. Definition of Ready enforcement

An issue is ready only if:
- labels are complete,
- parentage is explicit,
- milestone is assigned,
- blockers are identified,
- scope is bounded,
- acceptance criteria are checkable.

See `docs/github/definition-of-ready-done.md`.

---

## 18. Definition of Done enforcement

An issue is done only if:
- all acceptance criteria are checked,
- output artifacts exist,
- linked docs are updated if needed,
- dependency references are current,
- PR work is merged if code was required.

See `docs/github/definition-of-ready-done.md`.

---

## 19. Weekly backlog hygiene checklist

1. Confirm every open issue has full required labels.
2. Confirm every open non-epic has a parent.
3. Confirm every epic has decomposed child issues.
4. Convert any label-only parent relationships into GitHub sub-issues.
5. Review all `status:blocked` issues for live blockers.
6. Split any issue that is still too broad.
7. Review stream and area assignments for correctness.
8. Update #28 only for roadmap-level changes.
9. Close or supersede stale placeholder issues.
10. Verify automation expectations still match live taxonomy.

---

## 20. Milestone policy

See `docs/github/milestones.md` for the canonical milestone set (M1–M7), assignment rules, and retirement policy.

---

## 21. Dependency management

See `docs/github/dependency-management.md` for the encoding convention, canonical dependency chains, and review cadence.

---

## 22. Roadmap operations

See `docs/github/roadmap-operations.md` for how the roadmap issue (#28) is maintained and updated.

---

## 23. Documentation lifecycle and stale-doc retirement policy

To maintain repository alignment and prevent stale requirements:
- **Creation:** A new spec is created only for permanent, cross-cutting subsystems. Feature-specific notes belong in issue descriptions rather than individual files.
- **Maintenance:** Any PR modifying a public interface or data type must update its corresponding specification under `docs/specification/`.
- **Retirement:** Outdated specs must not be left active. They must either be updated to match the active codebase, deleted if history is not needed, or superseded.
- **Superseded Banners:** When a document is superseded, prefix the file immediately with a high-visibility notice in this format:

```markdown
> [!WARNING]
> **Status:** Superseded
> **Replaced by:** [New Canonical Document Name](./path/to/new-doc.md)
> **Notice:** This document is preserved for historical context only. Do not edit this file.
```

---

## 24. Working rule

When creating or editing a CRF.xl issue:

1. Use the correct title prefix.
2. Apply all required labels immediately.
3. Assign the correct milestone.
4. Decide and encode the parent relationship.
5. Add structured body sections.
6. Add dependencies explicitly.
7. Split if the issue is larger than one coherent delivery unit.

