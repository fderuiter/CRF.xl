# CRF.xl: Clinical Design Engine

CRF.xl is an Excel Add-in designed to transform a standard workbook into a structured clinical design environment. It acts as a single-source-of-truth compiler, allowing Data Managers to build Case Report Forms (CRFs) in Excel, and instantly generate pixel-perfect Word documents and machine-readable EDC specifications (CDISC ODM).

## 🚀 Quick Start

### Prerequisites
* Node.js (v20 or higher)
* Excel Desktop or an Office 365 Account (for Web)

### Installation
1. Clone the repository: `git clone [your-repo-url]`
2. Install dependencies: `npm install`
3. Start the local development server: `npm run start`

*Note: The first time you run the start command, it may ask you to install local SSL certificates. Accept this prompt, as Office Add-ins require HTTPS to run locally.*

## 🏗️ Architecture

The application is divided into two primary layers:

* **The Task Pane (Frontend):** A React/TypeScript application running inside Excel via `Office.js`. Located in `src/taskpane/components/`, it provides real-time metadata validation, authoring controls, and export triggers. Key views:
  * `App.tsx` — root orchestrator and contextual routing
  * `views/RegistryView.tsx` — form/item registry browser
  * `views/MatrixView.tsx` — study schedule matrix with search and filter
  * `views/AuthoringView.tsx` — item-level authoring and editing
  * `views/DictionarySidecar.tsx` — codelist and terminology browser

* **The Clinical Engine (Core):** Located in `src/taskpane/core/`. Organized into four subdirectories:

  * `core/types/` — TypeScript type definitions for clinical metadata (OIDs, StudyDesign, CrfItem, Codelist, Schedule, and CDISC mapping types)
  * `core/parser/` — Excel workbook readers and validation engine:
    * `excel-parser.ts` — parses `_Study`, `_Codelists`, `_Forms`, form sheets, and `_Schedule` into a typed `StudyDesign`
    * `validator.ts` — validates referential integrity, numeric metadata, and codelist consistency
    * `template-generator.ts` — initializes and synchronizes the workbook structure
    * `chunking-runtime.ts` — handles large-workbook sheet parsing with memory management
  * `core/generators/` — export engines:
    * `generators/docx/docx-builder.ts` — DOCX annotated CRF generation
    * `generators/cdisc/odm-builder.ts` — CDISC ODM XML export
  * `core/services/` — Office.js-isolating service layer:
    * `authoring-service.ts` — item-level authoring and write-back
    * `cdisc-api-service.ts` — CDISC Library API client
    * `dictionary-service.ts` — codelist and terminology write operations

See `docs/architecture/module-map.md` for the complete module inventory and `docs/architecture/adr-index.md` for key architectural decisions.

## 🛠️ Tech Stack
* **Framework:** React 18
* **Language:** TypeScript
* **Office Integration:** `Office.js`
* **Word Generation:** `docx`
* **Data Parsing:** `exceljs`
* **Dictionary Sidecar:** Fluent UI v9 `DataGrid` for searchable codelist browsing

## 📖 Development Workflow

1. **Define Types First:** New features start in `src/taskpane/core/types/`. Add or extend the relevant type definitions for the new clinical concept.
2. **Build the Parser:** Update `core/parser/excel-parser.ts` to read the new workbook columns or sheets into the type model.
3. **Add Validation:** Update `core/parser/validator.ts` with any new referential or clinical validation rules.
4. **Implement the Service:** Add any Office.js write-back or external API calls in the appropriate `core/services/` module.
5. **Update the Generators:** Update `core/generators/docx/docx-builder.ts` or `core/generators/cdisc/odm-builder.ts` to output the new data.
6. **Wire the UI:** Update or add a component in `components/views/` to expose the feature in the taskpane.
7. **Validate Sidecar UX:** Changes to `DictionarySidecar.tsx` must preserve the existing create/use flows while keeping codelist search responsive.

## ✅ CI Quality Gates & Branch Protection
- On every pull request, GitHub Actions runs:
  - `npm audit --omit=dev --audit-level=high`
  - `npx tsc --noEmit`
  - `npm test`
- Pull requests should only be merged when all required status checks are green.
- For dependency lifecycle and security audit tracking, see `SECURITY.md` and run `npm run audit:json`.

### Configure Main Branch Protection
1. Go to **Settings → Branches → Add rule** (or update the existing `main` rule).
2. Enable **Require a pull request before merging**.
3. Enable **Require status checks to pass before merging**.
4. Add the CI checks from the `CRF.xl CI` workflow (the `build-and-test` job entry, which includes dependency audit + typecheck + tests).
5. Save the rule.

## 🔒 Sheet Protection (Support Notes)
- `_Forms`
  - **Locked:** `A1:D1` (header row)
  - **Editable:** `A2:D1000` (form registry user input)
- `_Schedule`
  - **Locked:** `A1:XFD1` (header row), `A2:A1000` (formula-driven form OID column)
  - **Editable:** `B2:XFD1000` (visit matrix user input)

## 📋 Compliance Documentation
- **Security posture (CIS control mapping with access/data/audit evidence):** `SECURITY.md`
- **21 CFR Part 11 mapping (Excel versioning/audit trail walkthrough):** `docs/compliance/21-cfr-part-11-excel-versioning.md`
- **CDISC Library standards fetcher contract (OAuth, endpoints, retries, typed errors):** `docs/specification/cdisc-api-service.md`
- **GitHub issue taxonomy and hierarchy rules:** `docs/github/issue-governance.md`
- **Milestone policy (M1–M7 canonical model):** `docs/github/milestones.md`
- **Backlog-to-codebase alignment audit:** `docs/github/codebase-alignment.md`
- **Dependency management and encoding convention:** `docs/github/dependency-management.md`
- **Roadmap dashboard operations guide:** `docs/github/roadmap-operations.md`
- **Definition of Ready and Done (quality gates by issue type):** `docs/github/definition-of-ready-done.md`
- **Module map (full core/ module inventory):** `docs/architecture/module-map.md`
- **Architecture Decision Record index:** `docs/architecture/adr-index.md`

## 🚢 Manifest & Deployment
- Environment manifests:
  - `manifest.dev.xml`
  - `manifest.staging.xml`
  - `manifest.production.xml`
- Validate manifests before release: `npm run manifest:validate`
- Deployment runbook: `docs/deployment/manifests.md`
- Version update notification mechanism and cadence: `docs/deployment/manifests.md#taskpane-version-update-notification-mechanism`

## 💾 Local Recovery Snapshot Scope
- Stored in browser `localStorage` as a recovery snapshot for accidental refresh/crash recovery.
- Includes:
  - Validation summary + visible diagnostic log items (level/message/location/row/sheet)
  - Parsed study summary only (form count, variable count, visit count)
  - UI analysis context (open form + active validation filter)
  - Snapshot metadata (saved timestamp + app version)
- Excludes:
  - Credentials, API keys, tokens, secrets
  - Raw workbook cell contents
  - Full parsed `StudyDesign` payload
- Recovery snapshots auto-expire after 7 days.
