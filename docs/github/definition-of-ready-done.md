# Definition of Ready and Definition of Done

This document defines the quality gates for CRF.xl issues. An issue is **ready** when it can be picked up without blockers or ambiguity. An issue is **done** when it can be closed without rework.

---

## Definition of Ready

An issue is ready to be started when **all** of the following are true:

### Required for all issue types
- [ ] Has a clear objective or outcome statement
- [ ] Has `type:*`, `status:ready`, `priority:*`, `stream:*`, and one or two `area:*` labels
- [ ] Has exactly one milestone assigned
- [ ] All upstream blockers are identified (via dependency comments and body references)
- [ ] No unresolved design questions that would stop implementation mid-work

### Required for epics
- [ ] Outcome, In Scope, Out of Scope, Child Issues, Dependencies, and Exit Criteria sections present
- [ ] At least one decomposed child issue exists

### Required for features and tasks
- [ ] Objective, Scope, Acceptance Criteria, Dependencies, Out of Scope, and Codebase Alignment sections present
- [ ] Acceptance criteria are binary-checkable (not vague)
- [ ] Codebase Alignment section names the specific files or modules affected

### Required for doc issues
- [ ] Target file path identified
- [ ] Section headings or outline specified
- [ ] Any referenced issues or modules named

---

## Definition of Done

An issue is done and may be closed when **all** of the following are true:

### Required for all issue types
- [ ] All acceptance criteria are checked off in the issue body
- [ ] If the issue changed a module's public interface: `docs/architecture/module-map.md` is updated
- [ ] If a new module was added or an absent module was implemented: module-map.md updated and codebase-alignment.md updated
- [ ] PR is reviewed, CI is green, and merged to main

### Required for features and tasks
- [ ] Tests cover all new surface area
- [ ] If behavior visible to users changed: README updated
- [ ] If a new file was added to `src/taskpane/core/`: module-map.md has an entry

### Required for epics
- [ ] All child issues are closed
- [ ] Exit criteria in the epic body are checked off
- [ ] Codebase-alignment.md updated to reflect implementation status change

### Required for doc issues
- [ ] Target file exists at the documented path
- [ ] File is linked from README or the relevant governance/architecture doc
- [ ] Referenced issues are still accurate (not stale)

---

## Issue type-specific notes

### `type:epic`
Epics are closed only when all child issues are done and exit criteria are satisfied. Epics are never closed mid-stream because some children shipped — partial completion is tracked via child issue status.

### `type:feature`
Features must have real codebase surface (code, tests) before they are done. Design-only or spec-only work should remain `status:needs-design` or be tracked as a `type:task`.

### `type:task`
Tasks may produce: documentation, configuration, scripts, or design artifacts. The output type must be stated in the issue. Done when the stated output exists and is linked.

### `type:governance`
Governance issues are done when the structural change they track (label fix, milestone assignment, sub-issue encoding) is verified in the live repo.

### `type:docs`
Documentation issues are done when the file exists, is accurate, and is linked from at least one other document.

---

## Blocked issues

An issue with `status:blocked` does not qualify as ready. Before setting `status:ready`:
1. Confirm the upstream dependency has shipped
2. Remove or update the dependency comment
3. Verify the issue body's Dependencies section is accurate
4. Then change the label to `status:ready`
