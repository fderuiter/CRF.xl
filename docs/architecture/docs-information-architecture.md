# Documentation Information Architecture

This document defines the canonical structure, directory taxonomy, writing standards, and lifecycle rules for all documentation in the CRF.xl repository. The goal is to prevent folder drift, eliminate duplicate planning content, and keep technical contracts grounded in actual code implementation.

---

## 🏛️ Directory Taxonomy and Folder Boundaries

To maintain clear organization, all documentation files in the `docs/` tree must be placed within one of the following six directories based on their primary purpose:

### 1. `docs/architecture/`
* **Purpose:** System boundaries, module mapping, and high-impact structural decisions.
* **Canonical Content:** Module inventories, codebase maps, and Architecture Decision Records (ADRs).
* **Rule:** Do not put temporary milestone roadmaps or specific feature details here. Focus only on structural relationships and logic rules.

### 2. `docs/specification/`
* **Purpose:** Stable subsystem contracts, schemas, API specifications, and interface definitions.
* **Canonical Content:** Service APIs (CDISC, annotations), parser schemas, serialization rules, and the high-level platform scope.
* **Rule:** Specifications must describe **what** the system does and **how** it behaves under a given contract, not who implements it or when it is scheduled. Keep these documents contract-driven, not roadmap-driven.

### 3. `docs/compliance/`
* **Purpose:** Regulatory GxP evidence, electronic signature mapping, and audit trail validation.
* **Canonical Content:** 21 CFR Part 11 mappings, data governance procedures, and audit trail explanations.
* **Rule:** All statements must match actual codebase systems and native Office 365 environment limits. Do not document planned, unbuilt compliance features as if they are current.

### 4. `docs/deployment/`
* **Purpose:** Production/staging manifests, hosting runbooks, and environment configs.
* **Canonical Content:** Office Add-in manifest schemas, staging/production URLs, release checklists, and update alerts.
* **Rule:** Must clearly separate currently running production setups from pending external provisioning work.

### 5. `docs/qa-testing/`
* **Purpose:** Testing strategies, performance budgets, fixture policies, and non-functional requirements (NFR) evidence.
* **Canonical Content:** Quality matrices, Jest unit/integration strategies, performance benchmark definitions, and UAT criteria.
* **Rule:** Every test strategy must map directly to test suites under `/test` or `/test/fixtures` in the codebase.

### 6. `docs/github/`
* **Purpose:** Strategic roadmaps, milestones, issue taxonomy, templates, and process policies.
* **Canonical Content:** Issue governance playbooks, milestone lists, Definition of Ready/Done, and active backlog-to-codebase alignments.
* **Rule:** This is the only directory that contains fast-changing planning prose and backlog management records.

---

## 📖 Writing Standards & Best Practices

Contributors must follow these guidelines when creating or editing files in the `docs/` tree:

1. **Deterministic Contracts:** Use precise, mathematical, or typings-first language for specs (e.g., specifying schemas, error codes, and exact outputs).
2. **Local Markdown Links:** Cross-link documents using relative paths (e.g., `[Module Map](../architecture/module-map.md)`) so that navigation remains fully functional across GitHub, editors, and local workspaces.
3. **No Superlatives:** Keep the tone objective and technical. Do not write "perfectly validated", "flawless engine", or similar phrases.
4. **Code Realism:** Every technical specification must align with a codebase file listed in `docs/architecture/module-map.md` or mapped in `docs/github/codebase-alignment.md`.

---

## 🔄 Document Lifecycle Rules

To prevent documentation from becoming stale:
* **Creation:** Create a new document only if the concept crosses multiple issues or represents a permanent subsystem.
* **Updates:** When a PR changes a public interface or core schema, the corresponding specification doc under `docs/specification/` must be updated as part of the same PR.
* **Retirement:** Stale documents must be immediately marked as superseded (using the standard banner) rather than being left active.
