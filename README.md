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

## 📖 Development Workflow
1. **Define Types First:** Any new feature (e.g., adding a new SDTM mapping column) must start with updating `src/taskpane/core/types.ts`.
2. **Build the Parser:** Update `parser.ts` to read that new column.
3. **Update the Generator:** Update `generator.ts` to output that data to the Word document.

## ✅ CI Quality Gates & Branch Protection
- On every pull request, GitHub Actions runs:
  - `npx tsc --noEmit`
  - `npm test`
- Pull requests should only be merged when all required status checks are green.

### Configure Main Branch Protection
1. Go to **Settings → Branches → Add rule** (or update the existing `main` rule).
2. Enable **Require a pull request before merging**.
3. Enable **Require status checks to pass before merging**.
4. Add the CI checks from the `CRF.xl CI` workflow (the `build-and-test` job entries).
5. Save the rule.

## 🔒 Sheet Protection (Support Notes)
- `_Forms`
  - **Locked:** `A1:D1` (header row)
  - **Editable:** `A2:D1000` (form registry user input)
- `_Schedule`
  - **Locked:** `A1:XFD1` (header row), `A2:A1000` (formula-driven form OID column)
  - **Editable:** `B2:XFD1000` (visit matrix user input)
