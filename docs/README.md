# CRF.xl Documentation Map

Welcome to the CRF.xl Clinical Design Engine documentation tree. This directory is structured as a decentralized, role-based information system. Grounded in GxP compliance and modern clinical software standards, the documentation provides distinct paths for engineering, product, compliance, and deployment roles.

---

## 🧭 Navigational Paths

### 💻 For Engineering
Learn about the architecture, module boundaries, technical decisions, and active quality gates:
* Read the [Module Map](./architecture/module-map.md) for a complete code module inventory.
* Explore the [Architecture Decision Records (ADRs)](./architecture/adr-index.md) to understand key architectural decisions.
* See the [QA & Testing Strategy Index](./qa-testing/README.md) for the active quality gates.
* View the subsystem specifications for implementation contracts:
  * [Rules and Logic Contract](./specification/rules-and-logic-contract.md)
  * [Annotation System Contract](./specification/annotation-system-contract.md)
  * [Reviewer Export Contract](./specification/reviewer-export-contract.md)
  * [Ingestion Normalization Contract](./specification/ingestion-normalization-contract.md)
  * [CDISC Library API Service Contract](./specification/cdisc-api-service.md)

### 📋 For Product & Delivery
Understand platform capabilities, roadmap alignment, milestones, and issue tracking rules:
* Read the [Product Scope](./specification/product-scope.md) to understand current capability boundaries.
* Review the [Strategic Delivery Dashboard (#28)](https://github.com/fderuiter/CRF.xl/issues/28) master issue.
* Review the [Definition of Ready & Definition of Done](./github/definition-of-ready-done.md) quality gates.
* Explore the [Milestone Policy](./github/milestones.md) (M1–M7).
* Consult the [Backlog to Codebase Alignment](./github/codebase-alignment.md) mapping.

### 🔒 For Compliance & Quality
Verify regulatory controls, security postures, and electronic record evidence:
* Check the [21 CFR Part 11 Compliance Mapping](./compliance/21-cfr-part-11-excel-versioning.md) for electronic signatures and Excel versioning.
* See `SECURITY.md` in the root folder for CIS control mapping and data security.
* Audit the [Clinical Validation Rules Dictionary](./specification/clinical-validation-rules-dictionary.md).

### 🚀 For Deployment & Operations
Understand deployment environments, Office manifests, and release steps:
* Consult the [Deployment and Manifest Guide](./deployment/manifests.md) for environments and validation.

---

## 📁 Directory Taxonomy

| Directory | Ownership | Contents |
| --- | --- | --- |
| [architecture/](./architecture/) | Engineering | Module maps, ADRs, boundaries, documentation structure rules |
| [specification/](./specification/) | Engineering / Product | Subsystem contracts, API specs, schemas, platform scope |
| [compliance/](./compliance/) | Quality / Security | GxP evidence, 21 CFR Part 11 mappings, security controls |
| [deployment/](./deployment/) | DevOps | Add-in manifests, environment configs, deployment runbooks |
| [qa-testing/](./qa-testing/) | Engineering / QA | Quality matrix, benchmarks, test strategies, fixture rules |
| [github/](./github/) | Program Management | Backlog governance, milestones, issues taxonomy, taxonomy |

---

## 🔄 Superseded / Replaced Registry

The following documents have been retired and replaced to maintain high alignment between documentation and code:

| Retired File | Replacement File | Purpose of Change |
| --- | --- | --- |
| `docs/mvp-specification.md` | [product-scope.md](./specification/product-scope.md) | Shift away from legacy MVP framing to multi-stream capability scope. |
| `docs/qa-testing.md` | [qa-testing/README.md](./qa-testing/README.md) | Folderized and structured QA index linking to specific suites. |
| `docs/serialization-proofing.md` | [specification/export-serialization-requirements.md](./specification/export-serialization-requirements.md) | Standardized contract for deterministic ODM XML serialization. |
