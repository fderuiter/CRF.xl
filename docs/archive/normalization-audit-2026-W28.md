# Normalization Audit — 2026-W28

**Reviewer:** Jules (AI Engineer)
**Date:** 2026-07-13
**Objective:** Bring all open issues into compliance with the repository's canonical taxonomy and structural hierarchy.

## 1. Stream Decisions

### #66 Variable Level Metadata (VLM) & Methods Registry
- **Decision:** Assigned to `stream:core-metadata`.
- **Rationale:** Although VLM has ingestion components, its primary role in CRF.xl is defining the foundational clinical metadata schema and rules registry. It acts as a core engine prerequisite for subsequent standards mapping and migration features.

### #93 CDISC API Mapping Layer
- **Decision:** Confirmed in `stream:ingestion-migration`.
- **Rationale:** This layer is strictly an integration component for CDISC Library API artifacts, facilitating the ingestion and transformation of terminology into the CRF.xl model.

---

## 2. Taxonomy Compliance Audit

| Issue | Title | Type | Status | Priority | Stream | Area(s) | Findings / Actions |
|-------|-------|------|--------|----------|--------|---------|--------------------|
| #322  | Define Non-Functional... | task | verify | p1 | audit-governance | excel-integration | Missing all taxonomy labels. |
| #321  | [Docs] Create Module Map... | docs | verify | p1 | audit-governance | devops | (Assuming labels from title/context) |
| #154  | [Task] Create Release... | task | ready | p1 | enterprise-hardening | security-compliance, devops | Compliant. |
| #153  | [Task] Define Non-Func... | task | ready | p1 | audit-governance | excel-integration | Compliant. |
| #152  | [Task] Create E2E Quality... | task | ready | p1 | audit-governance | validation-rules | Compliant. |
| #143  | [Governance] Maintain... | governance | in-progress | p1 | audit-governance | devops | Compliant. |
| #141  | [Governance] Normalize... | governance | ready | p0 | audit-governance | devops | Compliant. |
| #135  | [Task] Finalize Deployment...| task | blocked | p0 | enterprise-hardening | security-compliance, devops | Compliant. |
| #75   | [Epic] Audit Trail... | epic | ready | p1 | audit-governance | security-compliance, audit-trail | Deprecated `phase:3` label. |
| #68   | [Epic] Enterprise Dist... | epic | ready | p0 | enterprise-hardening | security-compliance, devops | Deprecated `phase:2` label. |
| #28   | [Roadmap] CRF.xl Strat... | roadmap | ready | p0 | audit-governance | devops | Missing stream/area. Deprecated `phase:2` label. |

---

## 3. Structural Hierarchy Normalization

The following issues carry the `relation:child-of-epic` label but lack formal GitHub sub-issue links. These should be converted to sub-issues of their respective parents.

| Child Issue | Parent Epic | Action |
|-------------|-------------|--------|
| #138 | #53 | Link as sub-issue |
| #137 | #53 | Link as sub-issue |
| #55  | #53 | Link as sub-issue |
| #54  | #53 | Link as sub-issue |
| #130 | #85 | Link as sub-issue |
| #129 | #85 | Link as sub-issue |
| #128 | #85 | Link as sub-issue |
| #93  | #44 | Link as sub-issue |
| #86  | #39 | Link as sub-issue |
| #84  | #39 | Link as sub-issue |
| #83  | #39 | Link as sub-issue |
| #78  | #56 | Link as sub-issue |
| #63  | #76 | Link as sub-issue |
| #58  | #56 | Link as sub-issue |
| #57  | #56 | Link as sub-issue |
| #46  | #44 | Link as sub-issue |

---

## 4. Implementation Script (`gh` commands)

The following commands can be executed via the GitHub CLI to apply the normalization changes.

### Taxonomy Updates
```bash
# Remove deprecated phase labels
gh issue edit 75 --remove-label "phase:3"
gh issue edit 68 --remove-label "phase:2"
gh issue edit 28 --remove-label "phase:2"

# Fix #322 (PR/Task) labels
gh issue edit 322 --add-label "type:task,status:verify,priority:p1,stream:audit-governance,area:excel-integration"

# Fix #28 (Roadmap) labels
gh issue edit 28 --add-label "stream:audit-governance,area:devops"

# Fix #66 (VLM) stream assignment
gh issue edit 66 --add-label "stream:core-metadata" --remove-label "stream:ingestion-migration"
```

### Hierarchy Conversion (Sub-Issues)
*Note: GitHub sub-issues may require the `gh issue edit --parent-id` or UI interaction depending on your CLI version and repository configuration.*

```bash
# Epic #53: Advanced Logic
gh issue edit 138 --parent-id 53
gh issue edit 137 --parent-id 53
gh issue edit 55 --parent-id 53
gh issue edit 54 --parent-id 53

# Epic #85: Metadata Diff
gh issue edit 130 --parent-id 85
gh issue edit 129 --parent-id 85
gh issue edit 128 --parent-id 85

# Epic #44: Standards Import
gh issue edit 93 --parent-id 44
gh issue edit 46 --parent-id 44

# Epic #39: Multi-Language
gh issue edit 86 --parent-id 39
gh issue edit 84 --parent-id 39
gh issue edit 83 --parent-id 39

# Epic #56: Reviewer Export
gh issue edit 78 --parent-id 56
gh issue edit 58 --parent-id 56
gh issue edit 57 --parent-id 56

# Epic #76: Ingestion Wizards
gh issue edit 63 --parent-id 76

# Retire relation labels after linking
gh issue edit 138,137,55,54,130,129,128,93,86,84,83,78,63,58,57,46 --remove-label "relation:child-of-epic"
```

### Blocker Body References
Ensure the following issues have explicit `## Dependencies` sections listing their blockers:
- **#135:** Add `Blocked by: #136` (if provisioning is tracked there) or "Blocked by: external environment provisioning".
- **#75:** Add `Blocked by: #68`.
- **#54, #55, #139:** Ensure #137 and #138 are listed in the body. (Already documented in `dependency-management.md`).
