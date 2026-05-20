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

### Advanced logic epic (#53)

```
#137 _Rules Parser & AST Generator       ← no blockers (foundation; start here)
  └─► #138 DAG Topological Sort          ← blocked by #137
  └─► #54  Cross-Form Logic Validation   ← blocked by #137 and #138
  └─► #55  Derived Variables & Calculations ← blocked by #137 and #138 (structural)
  └─► #139 ODM ConditionDef/MethodDef    ← blocked by #137, #138 (and export contract decisions)
```

**Implication:** #137 is the absolute foundation of the cluster. However, structural dependencies dictate that:
1. **#138 (DAG Topological Sort)** must ship before **#54 (Cross-Form Logic Validation)** can evaluate reference chains and detect cross-form cycles.
2. **#55 (Derived Variables & Calculations)** has an *unstated structural dependency* on **#138 (DAG Topological Sort)** because resolving derived variable calculations requires generating a cycle-free directed graph and resolving evaluation order.
3. **#139 (ODM ConditionDef/MethodDef)** has an *unstated structural dependency* on **#138 (DAG Topological Sort)** because we must topologically validate rules and calculations to prevent serializing cyclical logic into GxP-compliant CDISC ODM XML files.

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

---

## Epic #53 Encoded Issue Bodies & Dependency Comments

This registry records the exact encoding of the issue headers, body `Dependencies` sections, and pinned blocker comments for all child issues under the **Advanced Logic Epic (#53)**.

### #137 _Rules Parser & AST Generator
* **Type:** `type:feature`
* **Milestone:** `M1 — Core Metadata Foundations`
* **Status in Code:** **Complete / Resolved** (Implemented in `rules-parser.ts` and `rules-ast.ts` with 100% unit test coverage).
* **Dependencies Section:**
  ```markdown
  ## Dependencies
  - None (acts as the foundational parsing engine for all logic-based features).
  ```
* **Pinned Blocker Comment:**
  *(None - foundation; start here)*

### #138 DAG Topological Sort
* **Type:** `type:feature`
* **Milestone:** `M1 — Core Metadata Foundations`
* **Status in Code:** **Ready**
* **Dependencies Section:**
  ```markdown
  ## Dependencies
  - Blocked by #137 (_Rules Parser & AST Generator) — the rule AST types are required to extract variable references and build the dependency graph.
  ```
* **Pinned Blocker Comment:**
  > 📌 **Dependency Status:** `Blocked` by #137. This issue requires the underlying AST Node models and rules parsing library to build the dependency tree and analyze expressions for topological sorting.

### #54 Cross-Form Logic Validation
* **Type:** `type:feature`
* **Milestone:** `M1 — Core Metadata Foundations`
* **Status in Code:** **Blocked**
* **Dependencies Section:**
  ```markdown
  ## Dependencies
  - Blocked by #137 (_Rules Parser & AST Generator) — Show If expressions must be parsed to extract cross-form variables.
  - Blocked by #138 (DAG Topological Sort) — Cross-form validation depends on the cycle detector and topological sorter to trace multi-form variable dependencies and detect circular cross-form rules.
  ```
* **Pinned Blocker Comment:**
  > 📌 **Dependency Status:** `Blocked` by #137 and #138. The cross-form validator cannot trace reference chains or evaluate circular relationships until the rules parser (#137) and the graph cycle validator (#138) are implemented and integrated.

### #55 Derived Variables & Calculations
* **Type:** `type:feature`
* **Milestone:** `M1 — Core Metadata Foundations`
* **Status in Code:** **Blocked**
* **Dependencies Section:**
  ```markdown
  ## Dependencies
  - Blocked by #137 (_Rules Parser & AST Generator) — Mathematical calculation expressions must be parsed into an AST for evaluation.
  - Blocked by #138 (DAG Topological Sort) — **[Structural Blocker]** Calculation evaluation order must be determined via topological sorting, and cycle detection must run to block circular mathematical derivations (e.g., `A = B + 1` and `B = A - 1`).
  ```
* **Pinned Blocker Comment:**
  > 📌 **Dependency Status:** `Blocked` by #137 and #138. Evaluating calculation expressions and resolving calculation sequences requires the rules parser (#137) and the topological sorting engine (#138) to execute derivations in a valid order and prevent cyclic mathematical dependencies.

### #139 ODM ConditionDef/MethodDef Serialization
* **Type:** `type:feature`
* **Milestone:** `M1 — Core Metadata Foundations`
* **Status in Code:** **Blocked**
* **Dependencies Section:**
  ```markdown
  ## Dependencies
  - Blocked by #137 (_Rules Parser & AST Generator) — Derivations and Show If expressions must be parsed before serialization to XML.
  - Blocked by #138 (DAG Topological Sort) — **[Structural Blocker]** The serialization compiler must only run on valid, topologically sorted, and cycle-free structures to avoid exporting broken or cyclical clinical metadata models.
  ```
* **Pinned Blocker Comment:**
  > 📌 **Dependency Status:** `Blocked` by #137 and #138. Serializing rules and derivations into compliant CDISC ODM `<ConditionDef>` and `<MethodDef>` tags requires Show If parsing (#137) and a stable topological validator (#138) to ensure only valid, non-cyclic models are serialized.

