# GitHub Issue Governance

This repository uses GitHub Issues as the execution system for roadmap, implementation, and governance work. The goal is a backlog that stays **actionable, auditable, and aligned to the codebase**.

## Required taxonomy

Every active issue must carry:

- exactly one `type:*` label
- exactly one `status:*` label
- exactly one `priority:*` label
- exactly one `stream:*` label, unless the issue is an explicit roadmap/index item
- one or two `area:*` labels

Use `relation:*` labels only for relationship metadata that is not already represented by GitHub's parent/sub-issue model.

## Stream rules

Use these stream labels consistently:

- `stream:core-metadata`
- `stream:ingestion-migration`
- `stream:authoring-ux`
- `stream:reviewer-export`
- `stream:enterprise-hardening`
- `stream:audit-governance`

### Stream ownership boundaries

1. **Core metadata** owns study structure, rule execution plumbing, schema, validation engines, and metadata serialization.
2. **Ingestion & migration** owns reverse parsing, migration flows, standards import mapping, and workbook-safe import pipelines.
3. **Authoring UX** owns authoring-side UI, internationalization support, annotation UX, and interactive author tooling.
4. **Reviewer / export** owns reviewer workflows, aCRF generation, and reviewer-facing export artifacts.
5. **Enterprise hardening** owns manifests, deployment, release validation, versioning, and operational security controls.
6. **Audit & governance** owns provenance, change-control policy, backlog governance, and architecture-to-process compliance work.

Do not let a single issue span two streams. Split the work or choose the owning stream and use `Blocked by #...` links for dependencies.

## Issue hierarchy

Use the hierarchy below:

- `type:roadmap` for umbrella/index issues only
- `type:epic` for owned delivery scope
- `type:feature` for implementation slices under an epic
- `type:task` for focused engineering, governance, or operational work
- `type:spike` for investigation/decision work

### Parent / child rules

Use GitHub sub-issues when the parent owns the child's scope. Child issues must also include an explicit body reference to the parent:

- `## Parent Epic`
- or `**Parent Epic:** #...`
- or `**Sub-Issue of:** ...`

Use `Blocked by #...` only for prerequisites. A dependency is not a parent unless the parent owns the delivered scope.

## Required issue body structure

### Epics

Epics must include:

- `## Outcome`
- `## In Scope`
- `## Out of Scope`
- `## Child Issues`
- `## Dependencies`
- `## Exit Criteria`

### Features and tasks

Implementation issues must include:

- `## Objective`
- `## Scope`
- `## Acceptance Criteria`
- `## Dependencies`
- `## Out of Scope`

### Spikes

Spikes must include:

- `## Question`
- `## Investigation Scope`
- `## Deliverable`
- `## Decision Summary`
- `## Issues To Update`

## Status rules

- `status:needs-more-information` — one concrete unknown blocks progress
- `status:needs-design` — scope exists, design or boundary work still needed
- `status:needs-acceptance-criteria` — design is understood, execution gate is AC quality
- `status:ready` — implementation can begin now
- `status:in-progress` — active implementation is underway
- `status:verify` — implementation merged, awaiting validation/closeout

Do not put more than one primary `status:*` label on an issue.

## Ready issue quality bar

An issue is not `status:ready` unless all of the following are true:

1. Acceptance criteria are testable.
2. Dependencies are explicit.
3. Out-of-scope boundaries are explicit.
4. Owning stream, type, priority, and area labels are present.
5. The issue is assigned to an active milestone.
6. The issue names the code surface it will touch, if implementation work is expected.

## Codebase alignment requirement

Implementation issues should identify the current or expected code surface using a short section such as:

```markdown
## Codebase Alignment

- `src/taskpane/core/parser/excel-parser.ts`
- `src/taskpane/core/services/dictionary-service.ts`
- `test/fixtures/cdisc-library/`
```

If the issue describes a capability that has no current code surface, say that directly and identify the expected new module.

## Duplicate and superseded handling

Use explicit language:

- `Duplicate of #...`
- `Superseded by #...`
- `Blocked by #...`
- `Unblocks #...`
- `Context for #...`

If an issue is superseded, close it promptly or rewrite it so its remaining scope is unique.

## Milestone rules

Active execution work belongs in the canonical milestone set documented in `docs/github/milestones.md`.

- Do not assign new work to retired phase milestones.
- Do not leave `status:ready` work without a milestone.
- Roadmap/index issues may remain unmilestoned if they are not execution work.

## Update responsibilities

When architecture, ownership, or dependencies change:

1. update the parent epic first
2. update affected child issues
3. update blockers/unblockers
4. update the milestone if the delivery queue changed
5. add a superseded/duplicate note where applicable

Backlog structure is part of the repository's maintainability surface. Treat issue hygiene as engineering work, not admin afterthought.
