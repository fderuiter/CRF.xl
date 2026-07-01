# Update to #28 [Roadmap] CRF.xl Strategic Delivery Dashboard

**Milestone Sequence Table Update:**

| Milestone | Focus | Status |
|-----------|-------|--------|
| M4 — Authoring UX & Internationalization | Authoring views, dictionary sidecar, annotations, internationalization | ✅ Complete |
| M5 — Reviewer Export & aCRF | Reviewer workflow and export rendering | 🟡 In Progress |

**Epic Index Update:**

- **stream:authoring-ux**
  - ✅ #35 [Epic] Fluent UI v9 Migration — (Completed: 0 legacy imports found)
  - ✅ #39 [Epic] Multi-Language Dictionary Support (eCOA)
  - ✅ #83 [Feature] Intelligent Dictionary Sidecar
- **stream:core-metadata**
  - ✅ #53 [Epic] Advanced Logic & Dynamic Branching — (Foundations #88, #137, #138 Complete)
  - ✅ #42 [Epic] Structural Guardrails
- **stream:reviewer-export**
  - 🟡 #56 [Epic] Reviewer-Ready Exports & User Enablement
  - 🔵 #90 [Feature] aCRF PDF Rendering Architecture — (Implemented in pdf-builder.ts)
- **stream:ingestion-migration**
  - ✅ #76 [Epic] Ingestion & Migration Wizards
  - 🔵 #91 [Feature] Migration Import Strategy — (Pipeline implemented)

**Sequencing Decisions Update:**
- #138 (DAG Topological Sort) is now resolved and integrated into the validator.
- #35 is closed; all new UI work must use Fluent UI v9.
