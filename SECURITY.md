# Security Posture (CIS Controls v16 Focus)

This document maps CRF.xl architecture and delivery controls to the CIS Controls framework, with emphasis on **Access Control**, **Data Protection**, and **Audit Log** requirements relevant to clinical metadata workflows.

## 1) Scope & System Context

- **Product boundary:** CRF.xl is a client-side Excel add-in (React + TypeScript + Office.js) used to author and validate clinical metadata.
- **Primary data handled:** protocol metadata, form definitions, schedules, codelists, validation artifacts, and generated ODM/XML or DOCX outputs.
- **Execution model:** logic executes in the task pane and Excel context; the repository does not define a backend API or persistence service.
- **Architecture reference:** `docs/specification/vision-system-architecture.md`.

## 2) Evidence Index (Diagrams, Policies, Reference Implementations)

| Evidence Type | File(s) | Security Relevance |
| --- | --- | --- |
| Architecture narrative | `docs/specification/vision-system-architecture.md` | Defines component boundaries and data flow layers. |
| CI and branch quality gates | `.github/workflows/main.yml`, `README.md` | Enforces reproducible install, typecheck, build, and tests on pull requests. |
| Workbook protection implementation | `src/taskpane/core/parser/template-generator.ts` | Applies locked ranges and protected system sheet behavior. |
| Parser and export handling | `src/taskpane/core/parser/excel-parser.ts`, `src/taskpane/core/generators/cdisc/odm-builder.ts` | Defines how workbook data is transformed into output artifacts. |
| Dependency stewardship policy | `package.json` scripts (`audit`, `audit:json`), this file | Captures recurring vulnerability review process and results. |
| Validation tests | `src/taskpane/**/__tests__` | Verifies core transformation and validation paths for regression control. |

## 3) CIS Control Mapping

### 3.1 Access Control

| CIS Area | Current Control in CRF.xl | Evidence |
| --- | --- | --- |
| CIS Control 6 (Access Control Management) | Changes flow through pull requests with required CI checks before merge. | `.github/workflows/main.yml`, `README.md` branch protection notes |
| CIS Control 16 (Application Software Security) | Static checks (`npx tsc --noEmit`), automated tests (`npm test`), and build validation run on PRs. | `.github/workflows/main.yml` |
| Least-privilege workbook editing | Registry sheets `_Forms` and `_Schedule` apply locked header/formula ranges while leaving designated input ranges editable. | `src/taskpane/core/parser/template-generator.ts` (`getSheetProtectionConfigs`) |

### 3.2 Data Protection

| CIS Area | Current Control in CRF.xl | Evidence |
| --- | --- | --- |
| CIS Control 3 (Data Protection) | Clinical metadata is processed from the active workbook in memory and transformed into structured objects before export. | `src/taskpane/core/parser/excel-parser.ts` |
| Integrity of controlled fields | Workbook scaffolding enforces data validation for key columns (data type, required flag, codelist references). | `src/taskpane/core/parser/template-generator.ts` |
| Supply chain hygiene | Dependency audit process is tracked, and lockfile is committed for reproducible dependency states. | `package.json`, `package-lock.json`, Security Audit Log below |

### 3.3 Audit Log & Traceability

| CIS Area | Current Control in CRF.xl | Evidence |
| --- | --- | --- |
| CIS Control 8 (Audit Log Management) | Security audit actions are logged in this document with command, result, and follow-up action. | Security Audit Log section |
| Change traceability | GitHub workflow runs provide PR-linked execution history for install, typecheck, build, and tests. | `.github/workflows/main.yml`, GitHub Actions run history |
| Validation traceability | Validation issues are surfaced in the UI diagnostic log to support operator review and correction loops. | `src/taskpane/components/ValidationLog.tsx` |

## 4) Security Audit Log

| Date (UTC) | Command | Result | Action |
| --- | --- | --- | --- |
| 2026-05-15 | `npm audit --json` | 18 high vulnerabilities | Baseline captured for dependency-lifecycle work. |
| 2026-05-15 | `npm install --save-dev copy-webpack-plugin@^14.0.0` + `npm audit --json` | 16 high vulnerabilities | Removed direct `copy-webpack-plugin`/`serialize-javascript` high vulnerability chain; validated with typecheck, tests, and production build. |

## 5) Current Risk Notes

- Remaining high vulnerabilities are transitive and currently cluster under `@opentelemetry/*`, `applicationinsights`, and `protobufjs`.
- These come through Office add-in tooling dependencies and are not directly imported by CRF.xl runtime application code.
- Mitigation path: track upstream toolchain releases, re-run `npm run audit:json` after upgrades, and document disposition updates in the Security Audit Log.

## 6) Maintenance Protocol (Documentation-as-Code)

- Update this file whenever architecture boundaries, security-relevant workflows, or dependency risk posture changes.
- For every material security change, include:
  1. Updated control mapping and evidence pointers.
  2. New audit-log entry with date, command, and disposition.
  3. Validation evidence (`npx tsc --noEmit`, `npm test`, `npm run build`) in the associated PR.
- During release preparation, reviewers should verify that control mappings still match implementation paths and workflow configuration.
