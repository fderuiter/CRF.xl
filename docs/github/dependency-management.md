# Dependency Management

This document defines how blocker and dependency relationships between issues are expressed, maintained, and resolved in CRF.xl.

---

## Encoding convention

When one issue cannot begin until another is complete, encode the dependency in two places:

1. **Dependency comment on the blocked issue** — a pinned comment on the blocked issue stating the upstream requirement in plain language.
2. **Body reference in the blocked issue** — the Dependencies section of the issue body lists all upstream blockers with issue links.

### Example
On issue `#138 DAG Topological Sort & Cycle Detection Validator`:
```
## Dependencies
- Blocked by #137 (_Rules Parser & AST Generator) — the rule AST types are required before the dependency graph can be built.
```

A dependency comment is also posted on #138 at time of issue creation or triage.

---

## Canonical dependency chains

### Advanced logic cluster (under #53)

```
#137  _Rules Parser & AST Generator         ← no blockers (M1 foundation; start here)
  └─► #138  DAG Topological Sort            ← blocked by #137
  └─► #54   Cross-Form Logic Validation     ← blocked by #137 and #138
  └─► #55   Derived Variables               ← blocked by #137
  └─► #139  ODM ConditionDef/MethodDef      ← blocked by #137 (and export contract)
```

**Implication:** #137 must ship before any other issue in this cluster can begin. It is the M1 critical path gate.

---

### Diff / comparison cluster (under #85)

```
#130  Baseline Workbook Ingestion UX        ← no blockers (M3 foundation; start here)
  └─► #129  Core Metadata Diff Engine       ← blocked by #130
        └─► #128  Diff Visualization UI     ← blocked by #129
```

**Implication:** #130 must ship before #129 can begin. Do not start diff visualization (#128) until the diff engine (#129) has a stable output type contract.

---

### Standards import cluster (under #44)

```
#93   CDISC API Mapping Layer               ← no blockers (scaffolding exists; start here)
  └─► #46   Controlled Terminology Import   ← blocked by #93
```

**Implication:** The mapping layer (#93) defines the transform contract between `cdisc-api-service.ts` and `dictionary-service.ts`. Controlled terminology import UI (#46) cannot be completed until that contract is stable.

---

## Review cadence

During the weekly backlog review:

1. Check each blocked issue — has its upstream dependency shipped?
2. If yes: remove the blocked-by comment status note, update `status:*` label from `status:blocked` to `status:ready`, and note in the issue body that the dependency is resolved.
3. If the upstream issue has been split or superseded: update the dependency reference to the new issue.

---

## Policy for splitting blocked work

If a blocked issue has preliminary work that does not depend on the upstream blocker (e.g., type definition, spike, or design doc), that work may be split into a separate preparatory issue that can proceed independently. The preparatory issue should:

- Be clearly scoped to only the non-blocked portion
- Reference the upstream blocker for the remaining work
- Not be labeled `status:blocked`

---

## When an upstream dependency ships

1. Remove or update the dependency comment on the previously blocked issue.
2. Change the issue's label from `status:blocked` to `status:ready` (or `status:needs-design` if design work is still required).
3. Update the Dependencies section of the issue body to note the dependency is resolved.
4. Update this document if the dependency chain changes materially.
