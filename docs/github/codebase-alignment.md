# Backlog to Codebase Alignment

This document records the current codebase evidence for high-impact backlog items so issue scope stays grounded in actual modules, tests, and gaps.

## Alignment matrix

| Issue | Status in code | Strongest evidence | Notes |
| --- | --- | --- | --- |
| `#129` Diff Engine | Present | `src/taskpane/core/services/diff-engine.ts`, `src/taskpane/core/types/diff.ts` | Pure diff engine implemented. `diffStudyDesigns()` produces a deterministic `StudyDiffReport` covering Forms, Items, Codelists, Rules, and top-level metadata. Full unit test coverage in `__tests__/diff-engine.test.ts`. |
| `#130` Baseline Workbook Ingestion UX | Present | `src/taskpane/core/services/baseline-workbook-service.ts`, `src/taskpane/core/parser/baseline-workbook-parser.ts`, `src/taskpane/components/views/RegistryView.tsx` | File-picker flow wired in `RegistryView`; `parseBaselineWorkbookFile` parses an `.xlsx` into a `StudyDesign` without mutating the active workbook. Invalid files surface a `BaselineWorkbookParseError` with a user-friendly message. |
| `#128` Diff Visualization UI | Present | `src/taskpane/components/views/StudyDiffView.tsx`, `src/taskpane/components/views/study-diff-view-utils.ts` | Fluent UI v9 visualization renders all four change classes (added, removed, modified, moved/renamed) grouped by entity type with filtering, pagination, and detail drill-down. |
| `#137` `_Rules` Parser & AST Generator | Present | `src/taskpane/core/parser/rules-parser.ts`, `src/taskpane/core/types/rules-ast.ts` | Tokenizer and AST parser engine, standard operator precedence parser, custom ParseError spans, and excel-parser sheet integration are fully implemented and verified with 100% unit test coverage. |
| `#138` DAG / Cycle Detection | Absent | `src/taskpane/core/parser/validator.ts` | Referential validation exists, but no dependency-graph or cycle detection implementation exists. |
| `#139` ODM `ConditionDef` / `MethodDef` serialization | Partial | `src/taskpane/core/generators/cdisc/odm-builder.ts` | Basic `ConditionDef` handling exists for item visibility; generalized rule/method export does not. |
| `#118` Display-only content blocks | Partial | `src/taskpane/core/parser/excel-parser.ts`, `src/taskpane/core/generators/docx/docx-builder.ts` | Rendering infrastructure exists, but parser/model support for display-only block types is still missing. |
| `#44` Standards import epic | Partial | `src/taskpane/core/services/cdisc-api-service.ts`, `src/taskpane/components/views/DictionarySidecar.tsx` | Fetcher and UI scaffolding exist, but the mapping layer remains the boundary between them. |
| `#93` CDISC mapping layer | Partial | `src/taskpane/core/services/cdisc-api-service.ts`, `test/fixtures/cdisc-library/` | API client and fixtures exist; dedicated transform contract/module is still missing. |
| `#46` Controlled terminology import UI/write | Partial | `src/taskpane/components/views/DictionarySidecar.tsx`, `src/taskpane/core/services/dictionary-service.ts` | Sidecar and Excel write patterns exist, but import trigger/conflict flow is not implemented. |
| `#68` Enterprise hardening | Present | `manifest.dev.xml`, `manifest.staging.xml`, `manifest.production.xml`, `scripts/validate-manifests.js`, `.github/workflows/main.yml`, `docs/deployment/manifests.md` | Manifest validation and deployment documentation are in place. |
| `#69` Production manifest management | Complete | `manifest.*.xml`, `scripts/validate-manifests.js`, `docs/deployment/manifests.md` | Closed work matches current repo state. |
| `#135` Deployment URLs & provisioning | Pending external dependency | `manifest.staging.xml`, `manifest.production.xml` | Placeholder hosts remain by design until infrastructure is provisioned. |

## Current architectural boundaries worth preserving

1. **Standards import:** fetcher (`cdisc-api-service.ts`) -> mapper (`#93`, new module expected) -> UI/write (`DictionarySidecar.tsx`, `dictionary-service.ts`)
2. **Advanced logic:** rule parsing (`#137`) -> graph validation (`#138`) -> downstream validation/export (`#54`, `#55`, `#139`)
3. **Diff/comparison:** baseline ingestion (`#130`) -> diff engine (`#129`) -> visualization (`#128`) — fully implemented
4. **Enterprise hardening:** manifests + validation scripts + deployment runbook live in the repo already; provisioning is the external dependency

## Expected-but-absent modules

The following modules are planned but not yet created. Their owning issues are listed.

| Expected module | Owning issue(s) | Notes |
| --- | --- | --- |
| `src/taskpane/core/parser/dag-validator.ts` | `#138` | DAG topological sort and cycle detection |
| `src/taskpane/core/services/cdisc-mapping-service.ts` | `#93` | Transform contract between CDISC Library API and internal types |

See `docs/architecture/module-map.md` for the complete module inventory including present modules.

## Working rule

When an issue changes materially, update this document if the owning files, tests, or implementation gaps changed too. For a complete codebase module inventory, see `docs/architecture/module-map.md`.
