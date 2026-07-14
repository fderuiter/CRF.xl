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

* **The Clinical Engine (Core):** Located in `src/taskpane/core/`. Organized into modular subdirectories:

  * `core/types/` — Centralized TypeScript definitions: `clinical.ts`, `hierarchy.ts`, `validation.ts`, `ui.ts`, `enums.ts`, `common.ts`.
  * `core/parser/` — Excel workbook readers and validation engine:
    * `excel-parser.ts` — parses workbook sheets into a typed `StudyDesign`.
    * `validator.ts` — validates referential integrity and numeric metadata.
    * `template-generator.ts` — initializes and synchronizes workbook structure.
    * `chunking-runtime.ts` — handles large-workbook parsing memory management.
  * `core/generators/` — Clinical export engines:
    * `cdisc/odm-builder.ts` — CDISC ODM XML export.
    * `docx/docx-builder.ts` — Pixel-perfect DOCX annotated CRF generation.
  * `core/services/` — Office.js-isolating service layer:
    * `authoring-service.ts` — Item-level authoring and write-back.
    * `annotation-service.ts` — Cell background and comment highlights.
    * `cdisc-api-service.ts` — CDISC Library API client.
    * `dictionary-service.ts` — Codelist and terminology write operations.
    * `recovery-storage.ts` — Browser-based recovery snapshot management.
    * `version-update-service.ts` — Add-in version check and notifications.
    * `office-error-handling.ts` — Normalization of Office.js API errors.

See [`docs/architecture/module-map.md`](./docs/architecture/module-map.md) for the complete module inventory and [`docs/architecture/adr-index.md`](./docs/architecture/adr-index.md) for key architectural decisions.

## 🛠️ Tech Stack
* **Framework:** React 18
* **Language:** TypeScript
* **Office Integration:** `Office.js`
* **Word Generation:** `docx`
* **Data Parsing:** `exceljs`
* **Dictionary Sidecar:** Fluent UI v9 `DataGrid` for searchable codelist browsing

## 📖 Development Workflow

1. **Define Types First:** New features start in `src/taskpane/core/types/`. Add or extend the relevant type definitions in the appropriate modular file (e.g., `clinical.ts` or `enums.ts`).
2. **Build the Parser:** Update `src/taskpane/core/parser/excel-parser.ts` to read the new workbook columns or sheets into the type model.
3. **Add Validation:** Update `src/taskpane/core/parser/validator.ts` with any new referential or clinical validation rules.
4. **Implement the Service:** Add any Office.js write-back or external API calls in a new or existing module within `src/taskpane/core/services/`.
5. **Update the Generators:** Update the relevant builder in `src/taskpane/core/generators/` (CDISC or DOCX) to support the new metadata.
6. **Wire the UI:** Update or add a component in `src/taskpane/components/views/` to expose the feature in the taskpane.
7. **Document the Change:** Update `docs/architecture/module-map.md` if any new modules were added or public interfaces changed.
8. **Validate Sidecar UX:** Changes to `DictionarySidecar.tsx` must preserve the existing create/use flows while keeping codelist search responsive.

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

## 📖 Project Documentation

All project documentation is structured and maintained under the [docs/](./docs/) directory. To explore specific documents, consult the canonical [CRF.xl Documentation Map](./docs/README.md).

### 🔍 Documentation Source of Truth Guidelines
To maintain alignment across teams and prevent drift, developers must consult the appropriate documentation directory based on the nature of their work:
* **Where stable technical contracts live:** Technical interface specs, rules grammar, and schemas are defined in their respective module directories within [src/](./src/). When code modifications alter a public signature or type definition, the corresponding spec must be updated in the same PR.
* **Where module boundaries live:** The [Module Map](./docs/architecture/module-map.md) provides a comprehensive inventory of all core modules, their responsibilities, and public interfaces.
* **Where design decisions live:** Major structural choices, architectural boundaries, and technology selections are recorded in [docs/architecture/adr-index.md](./docs/architecture/adr-index.md).
* **Where regulatory mappings live:** GxP audits, Part 11 alignments, and security evidence live in [docs/compliance/](./docs/compliance/) and `SECURITY.md`.
* **Where engineering & operations live:**
  * [Dependency Management](./docs/github/dependency-management.md) — rules for third-party libraries and security audits.
  * [Roadmap Operations](./docs/github/roadmap-operations.md) — milestone sequencing and release strategy.
  * [Definition of Ready/Done](./docs/github/definition-of-ready-done.md) — quality gates for development.
* **Where fast-changing requirements live:** Milestone scopes, feature sequencing, and backlog tickets live in [docs/github/](./docs/github/) and active GitHub issue templates. Evolving planning details belong in issues rather than specifications.

---

## 🚢 Manifest & Deployment
* Core application manifest:
  * [manifest.xml](./manifest.xml)
* Validate manifest before release: `npm run validate`
* Deployment runbook & version notifications: [docs/deployment/manifests.md](./docs/deployment/manifests.md)


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
