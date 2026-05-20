# Module Map

This document describes every module in `src/taskpane/core/`, its responsibility, primary public interface, upstream/downstream dependencies, and owning issue. Also lists expected-but-absent modules that are planned but not yet implemented.

Related: [`docs/github/codebase-alignment.md`](../github/codebase-alignment.md) — backlog-to-code alignment matrix.

---

## Parser modules (`src/taskpane/core/parser/`)

### `excel-parser.ts`
**Purpose:** Entry point for parsing the active Excel workbook into a `StudyDesign` model. Reads `_Study`, `_Codelists`, `_Forms`, each form sheet, and `_Schedule`. Supports partial sheet failures and parse warnings.

**Public interface:**
- `parseExcelToStudyDesign(context: Excel.RequestContext): Promise<ParseResult>`

**Upstream:** Office.js Excel API, `core/types/`
**Downstream:** `validator.ts`, `App.tsx`, generators
**Owning issues:** #53, #118, #137 (planned extension)

---

### `validator.ts`
**Purpose:** Validates a parsed `StudyDesign` against referential integrity and numeric metadata rules. Does not implement parsed rule logic, graph analysis, or cycle detection (those require #137 and #138).

**Public interface:**
- `validateStudyDesign(design: StudyDesign): ValidationIssue[]`

**Upstream:** `excel-parser.ts`, `core/types/validation.ts`
**Downstream:** `App.tsx`, `ValidationLog.tsx`
**Owning issues:** #53, #54 (planned extension), #138 (planned extension)

---

### `rules-parser.ts`
**Purpose:** Tokenizer and recursive descent parser for the rules logic grammar. Parses raw rule expressions into AST nodes, and workbook rows from the `_Rules` sheet into a standard `RuleDefinition[]` array.

**Public interface:**
- `tokenize(expression: string): Token[]`
- `parseRuleExpression(expression: string): ASTNode`
- `parseRulesSheetRows(rows: any[][], _studyVersion: string): { rules: RuleDefinition[]; errors: ParseError[] }`

**Upstream:** `core/types/index.ts`
**Downstream:** `excel-parser.ts`, graph validator (`#138`), serialization
**Owning issues:** #137

---

### `template-generator.ts`
**Purpose:** Workbook initialization, sheet scaffolding, navigation to source, and workbook sync/registry operations.

**Public interface:**
- `initializeWorkbook(context: Excel.RequestContext): Promise<void>`
- `navigateToSource(context: Excel.RequestContext, target: NavigationTarget): Promise<void>`
- `syncRegistry(context: Excel.RequestContext): Promise<void>`

**Upstream:** Office.js Excel API
**Downstream:** `App.tsx`
**Owning issues:** #68

---

### `chunking-runtime.ts`
**Purpose:** Handles large workbook parsing by splitting sheet reads into bounded chunks to avoid Office.js memory and timeout limits.

**Public interface:** Internal utility used by `excel-parser.ts`.

**Upstream:** Office.js Excel API
**Downstream:** `excel-parser.ts`
**Owning issues:** #68

---

## Generator modules (`src/taskpane/core/generators/`)

### `generators/cdisc/odm-builder.ts`
**Purpose:** Generates CDISC ODM XML from a validated `StudyDesign`. Includes basic `ConditionDef` support for item visibility. Generalized `ConditionDef`/`MethodDef` serialization for rules/methods is partial (see #139).

**Public interface:**
- `generateOdmXml(design: StudyDesign): string`

**Upstream:** `core/types/clinical.ts`, `core/types/hierarchy.ts`
**Downstream:** `App.tsx` (download trigger)
**Owning issues:** #44, #139 (planned extension)

---

### `generators/docx/docx-builder.ts`
**Purpose:** Generates pixel-perfect Word documents from a validated `StudyDesign` using the `docx` library.

**Public interface:**
- `generateDocx(design: StudyDesign): Promise<Blob>`

**Upstream:** `core/types/clinical.ts`
**Downstream:** `App.tsx` (download trigger)
**Owning issues:** #56, #57

---

## Service modules (`src/taskpane/core/services/`)

### `authoring-service.ts`
**Purpose:** CRF authoring operations — adding/removing forms and items, codelist mutations, and study-level metadata edits.

**Public interface:** Authoring action functions consumed by `AuthoringView.tsx`.

**Upstream:** Office.js Excel API, `core/types/`
**Downstream:** `components/views/AuthoringView.tsx`
**Owning issues:** #83, #84

---

### `annotation-service.ts`
**Purpose:** Paints and clears Excel cell annotations (fill, borders, comments) to provide visual feedback for validation state and authoring context.

**Public interface:**
- `paintAnnotations(context: Excel.RequestContext, issues: ValidationIssue[]): Promise<void>`
- `clearAnnotations(context: Excel.RequestContext): Promise<void>`

**Upstream:** Office.js Excel API, `core/types/validation.ts`
**Downstream:** `App.tsx`, `components/views/AuthoringView.tsx`
**Owning issues:** #84
**Risk:** `risk:excel-runtime` — painting performance degrades on large sheets

---

### `cdisc-api-service.ts`
**Purpose:** CDISC Library API client. Handles OAuth token acquisition, endpoint calls, typed error handling, and retry logic. Fetches controlled terminology and dataset metadata.

**Public interface:**
- `fetchCodelist(oid: string): Promise<CdiscCodelist>`
- `fetchDatasetMetadata(datasetName: string): Promise<CdiscDataset>`

**Upstream:** CDISC Library REST API (external)
**Downstream:** `components/views/DictionarySidecar.tsx`, `services/dictionary-service.ts`, mapping layer (`#93`, absent)
**Owning issues:** #44, #93

---

### `dictionary-service.ts`
**Purpose:** Codelist and dictionary write-back to Excel. Manages `_Codelists` sheet operations and codelist sync from sidecar selections.

**Public interface:**
- `writeCodelistToSheet(context: Excel.RequestContext, codelist: CdiscCodelist): Promise<void>`

**Upstream:** Office.js Excel API, `core/types/clinical.ts`
**Downstream:** `components/views/DictionarySidecar.tsx`
**Owning issues:** #46, #93

---

### `recovery-storage.ts`
**Purpose:** Manages localStorage recovery snapshots. Stores validation summary, parsed study summary, UI context, and snapshot metadata. Excludes raw workbook data and credentials. Snapshots auto-expire after 7 days.

**Public interface:**
- `saveRecoverySnapshot(snapshot: RecoverySnapshot): void`
- `loadRecoverySnapshot(): RecoverySnapshot | null`
- `clearExpiredSnapshots(): void`

**Upstream:** Browser localStorage API
**Downstream:** `App.tsx`
**Owning issues:** #68

---

### `version-update-service.ts`
**Purpose:** Polls the version update endpoint and notifies the taskpane when a newer version of CRF.xl is available.

**Public interface:**
- `checkForUpdate(currentVersion: string): Promise<UpdateStatus>`

**Upstream:** Version endpoint (external)
**Downstream:** `App.tsx` (notification banner)
**Owning issues:** #68

---

### `office-error-handling.ts`
**Purpose:** Normalizes Office.js API errors into typed application errors with contextual messages and recovery suggestions.

**Public interface:**
- `handleOfficeError(error: unknown): AppError`

**Upstream:** Office.js error surfaces
**Downstream:** All modules that call Office.js APIs
**Owning issues:** #68

---

## Type modules (`src/taskpane/core/types/`)

### `clinical.ts`
Core CRF metadata types: `StudyDesign`, `CrfForm`, `CrfItem`, `CrfCodelist`, `SdtmMapping`, visit structures.

### `hierarchy.ts`
Hierarchical structure types: form/item/codelist relationships, OID registry, parent-child metadata.

### `validation.ts`
Validation types: `ValidationIssue`, `ValidationLevel`, `ValidationResult`, `ParseResult`.

### `rules-ast.ts`
AST node types (Literal, Identifier, Unary, Binary, Conditional, Call, and Grouped Expression), location tracking interfaces (`SourcePosition`, `SourceLocation`), `RuleDefinition` structures, and the custom `ParseError` diagnostic class.

### `ui.ts`
UI state types: navigation context, filter state, view mode, sidecar state.

### `enums.ts`
Enumerated values: data types, validation levels, form types, status values.

### `common.ts`
Shared utility types: localized strings, OID references, generic result wrappers.

---

## Expected-but-absent modules

These modules are planned but not yet implemented. They are blocked by the issues listed.

| Expected Module | Purpose | Blocking Issue | Planned Location |
|-----------------|---------|----------------|-----------------|
| `parser/dag-validator.ts` | Topological sort and cycle detection on item dependency graph | #138 (blocked by #137) | `src/taskpane/core/parser/` |
| `services/diff-engine.ts` | Core metadata diff computation between two `StudyDesign` snapshots | #129 (blocked by #130) | `src/taskpane/core/services/` |
| `services/cdisc-mapping-service.ts` | Transform CDISC API responses to internal codelist/dataset structures | #93 | `src/taskpane/core/services/` |

---

## Legacy flat-file modules

These files at `src/taskpane/core/` root predate the modular architecture and are superseded by the modules above. They are retained for backward compatibility during the modular migration.

| File | Superseded by |
|------|---------------|
| `core/parser.ts` | `core/parser/excel-parser.ts` |
| `core/generator.ts` | `core/generators/docx/docx-builder.ts`, `core/generators/cdisc/odm-builder.ts` |

---

## Working rule

Update this document whenever:
- A new module is added to `src/taskpane/core/`
- An expected-but-absent module is implemented (move it to the present section)
- A module's public interface changes materially
- An owning issue changes
