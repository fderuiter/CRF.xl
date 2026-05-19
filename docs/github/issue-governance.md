# Issue Governance

This document defines the taxonomy, hierarchy rules, and operating standards for all GitHub issues in CRF.xl.

---

## Label taxonomy

Every active issue must carry exactly:
- **One** `type:*` label
- **One** `status:*` label
- **One** `priority:*` label
- **One** `stream:*` label
- **One or two** `area:*` labels

### Type labels

| Label | Used for |
|-------|----------|
| `type:epic` | Delivery container grouping related features under a stream |
| `type:feature` | Implementable unit of functionality with acceptance criteria |
| `type:task` | Scoped unit of work producing a non-code artifact (doc, config, design, checklist) |
| `type:governance` | Backlog health, taxonomy normalization, process control, and structure fixes |
| `type:docs` | Documentation file creation or update |
| `type:bug` | Defect in existing behavior |
| `type:refactor` | Code restructuring with no behavior change |
| `type:spike` | Time-boxed investigation with a defined output artifact |
| `type:roadmap` | The single strategic dashboard issue (#28); only one per repo |

### Status labels

| Label | Meaning |
|-------|---------|
| `status:needs-triage` | Newly created; not yet reviewed |
| `status:needs-design` | Accepted; design or scoping work still required before implementation |
| `status:needs-acceptance-criteria` | Design exists; acceptance criteria not yet written |
| `status:ready` | Fully defined; can be picked up (see Definition of Ready) |
| `status:in-progress` | Actively being worked |
| `status:verify` | Implementation complete; awaiting verification or acceptance review |
| `status:blocked` | Cannot proceed due to an upstream dependency or external blocker |
| `status:needs-more-information` | Waiting on clarification from the author or stakeholder |

### Priority labels

| Label | Meaning |
|-------|---------|
| `priority:p0` | Critical path; blocks a milestone or has an active external dependency |
| `priority:p1` | High priority; part of the current active milestone |
| `priority:p2` | Normal priority; scheduled for a future milestone |
| `priority:p3` | Low priority; deferred or nice-to-have |

### Stream labels

| Label | Scope |
|-------|-------|
| `stream:core-metadata` | Parser, validator, types, rule AST, diff engine, ODM/DOCX export |
| `stream:ingestion-migration` | CDISC API, reverse parsing, terminology import, migration wizards |
| `stream:authoring-ux` | Authoring views, dictionary sidecar, annotations, internationalization |
| `stream:reviewer-export` | Reviewer workflow, PDF/DOCX export rendering, aCRF generation |
| `stream:enterprise-hardening` | Manifests, deployment, CI enforcement, security, release hardening |
| `stream:audit-governance` | Audit trail, change-control compliance, backlog governance, architecture docs |

### Area labels

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

### Risk labels (supplemental — added alongside required labels)

| Label | Indicates |
|-------|-----------|
| `risk:excel-runtime` | Issue involves Office.js behavior that has known runtime risk |
| `risk:clinical-validation` | Issue affects clinical data validation logic |
| `risk:compliance` | Issue touches GxP or regulatory compliance surface |
| `risk:data-loss` | Issue involves operations that could cause data loss |
| `risk:performance` | Issue has a performance risk at scale |

### Relation labels (supplemental)

| Label | Indicates |
|-------|-----------|
| `relation:child-of-epic` | Issue is a child of a parent epic (must also be encoded as GitHub sub-issue) |
| `relation:blocked-by-epic` | Issue is pending resolution of a parent epic decision |
| `relation:duplicate-candidate` | May be a duplicate; pending review |
| `relation:superseded` | Replaced by another issue |

---

## Issue hierarchy

```
[Roadmap] #28                   — single strategic dashboard
  └─ Milestone M1–M7            — execution queue
       └─ [Epic] #N             — delivery container; one per stream/topic area
            └─ Feature #N       — implementable unit with acceptance criteria
                 └─ Task #N     — optional sub-unit of a feature
```

### Parent/child encoding

Parent/child relationships must be encoded in **two** ways:
1. **GitHub sub-issue link** — link the child as a sub-issue of the parent epic in the GitHub UI
2. **Body reference** — the child issue body lists `**Parent Epic:** #N` and the epic body lists the child issue in its Child Issues section

Label-only encoding (`relation:child-of-epic` without a GitHub sub-issue link) is a temporary state during triage. Issues in this state are tracked in #141.

---

## Issue body templates

### Epic body template
```markdown
# Epic #N: [Title]

**Parent:** [Roadmap] CRF.xl Strategic Delivery Dashboard (#28)
**Stream:** [stream name]
**Milestone:** [M1–M7]

## Outcome
[What success looks like for this epic]

## In Scope
- [Item]

## Out of Scope
- [Item]

## Child Issues
- #N [Title]

## Dependencies
- [Upstream issue or external dependency]

## Exit Criteria
- [ ] [Checkable criterion]
```

### Feature body template
```markdown
# Issue #N: [Title]

**Parent Epic:** #N [Epic Title]

## Objective
[One paragraph: what this feature does and why]

## Scope
- [In scope item]

## Acceptance Criteria
- [ ] [Binary-checkable criterion]

## Dependencies
- [Upstream issue reference if blocked]

## Out of Scope
- [Explicitly excluded item]

## Codebase Alignment
| File | Change type | Notes |
|------|-------------|-------|
| `src/taskpane/...` | New / Modified / Read | [description] |
```

---

## Milestone policy

See `docs/github/milestones.md` for the canonical milestone set (M1–M7), assignment rules, and retirement policy.

---

## Dependency management

See `docs/github/dependency-management.md` for the encoding convention, canonical dependency chains, and review cadence.

---

## Roadmap operations

See `docs/github/roadmap-operations.md` for how the roadmap issue (#28) is maintained and updated.

---

## Definition of Ready and Done

See `docs/github/definition-of-ready-done.md` for quality gates.

---

## Working rule

When creating a new issue:
1. Apply all five required label categories immediately.
2. Add body content per the appropriate template.
3. Assign a milestone.
4. If it is a child of an epic, add the GitHub sub-issue link and body reference.
5. If it is blocked, add a dependency comment and set `status:blocked`.
