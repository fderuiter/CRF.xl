# CRF.xl: Clinical Design Engine

CRF.xl is an Excel Add-in designed to transform a standard workbook into a structured clinical design environment. It acts as a single-source-of-truth compiler, allowing Data Managers to build Case Report Forms (CRFs) in Excel, and instantly generate pixel-perfect Word documents and machine-readable EDC specifications (CDISC ODM).

## 🚀 Quick Start

### Prerequisites
* Node.js (v18 or higher)
* Excel Desktop or an Office 365 Account (for Web)

### Installation
1. Clone the repository: `git clone [your-repo-url]`
2. Install dependencies: `npm install`
3. Start the local development server: `npm run start`

*Note: The first time you run the start command, it may ask you to install local SSL certificates. Accept this prompt, as Office Add-ins require HTTPS to run locally.*

## 🏗️ Architecture
The application is divided into two primary layers:
* **The Task Pane (Frontend):** A React/TypeScript application running inside Excel via `Office.js`. It provides real-time metadata validation and UI controls.
* **The Clinical Engine (Core):** Located in `src/taskpane/core/`.
  * `types.ts`: Strict TypeScript definitions for clinical metadata (SDTM, OIDs, Codelists).
  * `parser.ts`: Extracts and validates data from the active Excel sheet.
  * `generator.ts`: Uses `docx` to programmatically compile the clinical metadata into handwriting-optimized Word layouts.

## 🛠️ Tech Stack
* **Framework:** React 18
* **Language:** TypeScript
* **Office Integration:** `Office.js`
* **Word Generation:** `docx`
* **Data Parsing:** `exceljs`
* **Dictionary Sidecar:** Fluent UI v9 `DataGrid` for searchable codelist browsing

## 📖 Development Workflow
1. **Define Types First:** Any new feature (e.g., adding a new SDTM mapping column) must start with updating `src/taskpane/core/types.ts`.
2. **Build the Parser:** Update `parser.ts` to read that new column.
3. **Update the Generator:** Update `generator.ts` to output that data to the Word document.
4. **Validate Sidecar UX:** Changes to `src/taskpane/components/views/DictionarySidecar.tsx` should preserve the existing create/use flows while keeping codelist search responsive across IDs, display names, coded values, and decodes.

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
- **21 CFR Part 11 mapping (Excel versioning/audit trail walkthrough):** `docs/compliance/21-cfr-part-11-excel-versioning.md`
