# Module Map

This document describes every module in `src/taskpane/core/`, its responsibility, primary public interface, upstream/downstream dependencies, and owning issue. Also lists expected-but-absent modules that are planned but not yet implemented.

Related:
- [`docs/github/codebase-alignment.md`](../github/codebase-alignment.md) — backlog-to-code alignment matrix.
- [`docs/architecture/adr-index.md`](./adr-index.md) — architectural decision records index.

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

**Purpose:** Validates a parsed `StudyDesign` against referential integrity, numeric metadata rules, parsed rule logic dependencies, and cross-form variables.

**Public interface:**

- `validateStudyDesign(design: StudyDesign): ValidationIssue[]`
- `validateCrossFormDependencies(study: StudyDesign): { issues: ValidationIssue[]; dependencies: CrossFormDependency[] }`

**Upstream:** `excel-parser.ts`, `rules-validator.ts`, `core/types/validation.ts`
**Downstream:** `App.tsx`, `ValidationLog.tsx`
**Owning issues:** #53, #54, #55

---

### `dag-validator.ts`

**Purpose:** Dependency graph validator and topological sorter for CRF.xl Rules. Detects duplicate rule IDs, duplicate targets, broken references, unresolved variables, syntax issues, and circular dependencies in a deterministic DAG.

**Public interface:**

- `collectIdentifiers(node: ASTNode): string[]`
- `matchesRef(identifier: string, ref: string): boolean`
- `validateRules(rules: RuleDefinition[], study?: StudyDesign): RuleValidationResult`

**Upstream:** `rules-parser.ts`, `expression-validator.ts`, `core/types/`
**Downstream:** `validator.ts`, `odm-builder.ts`
**Owning issues:** #138

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

### `baseline-workbook-parser.ts`

**Purpose:** Parses raw sheet value arrays (from an ExcelJS workbook) into a `StudyDesign`. Mirrors the logic of `excel-parser.ts` but operates on pre-loaded sheet values rather than the live Office.js Excel API context, enabling safe out-of-process parsing of external baseline workbooks.

**Public interface:**

- `parseWorkbookSheetValuesToStudyDesign(provider: WorkbookSheetValuesProvider, options?: ParseWorkbookSheetValuesOptions): Promise<StudyDesign>`
- `WorkbookSheetValuesProvider` — interface abstracting raw sheet value access

**Upstream:** `core/types/`, `parser/form-element-utils.ts`, `parser/migration.ts`, `parser/metadata-utils.ts`, `parser/rules-parser.ts`
**Downstream:** `services/baseline-workbook-service.ts`
**Owning issues:** #130, #85

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

### `diff-engine.ts`

**Purpose:** Pure, side-effect-free engine that semantically compares two `StudyDesign` objects and produces a deterministic `StudyDiffReport`. Compares Forms, Items, Codelists, Rules, and top-level metadata fields. Detects added, removed, modified, and moved/renamed entities. No side effects on the active workbook or session.

**Public interface:**

- `diffStudyDesigns(baseline: StudyDesign, current: StudyDesign): StudyDiffReport`

**Upstream:** `core/types/diff.ts`, `core/types/hierarchy.ts`, `core/types/clinical.ts`, `core/types/rules-ast.ts`
**Downstream:** `App.tsx` (computes diff report from baseline + current study), `components/views/StudyDiffView.tsx` (visualization consumer)
**Owning issues:** #129, #85

---

### `baseline-workbook-service.ts`

**Purpose:** Parses a user-selected `.xlsx` workbook file into an in-memory baseline `StudyDesign` without mutating the active workbook or session. Validates that the selected file is a compatible CRF.xl workbook and surfaces user-friendly errors via `BaselineWorkbookParseError`.

**Public interface:**

- `parseBaselineWorkbookFile(file: BaselineWorkbookFileLike): Promise<StudyDesign>`
- `parseBaselineWorkbookBuffer(buffer: ArrayBuffer, sourceName?: string): Promise<StudyDesign>`
- `BaselineWorkbookParseError` — error class with `.userMessage` for taskpane display

**Upstream:** `exceljs`, `parser/baseline-workbook-parser.ts`
**Downstream:** `App.tsx` (wires file-input change handler), `components/views/RegistryView.tsx` (file selector button)
**Owning issues:** #130, #85

---

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
**Risk:** `risk:excel-runtime` — painting performance degrades on large sheets. See [Office.js Runtime Risk Register](./office-runtime-risk-register.md).

---

### `cdisc-api-service.ts`

**Purpose:** CDISC Library API client. Handles OAuth2 client-credentials token acquisition, retry/backoff, rate-limit handling, and timeout enforcement. Exposes typed results (`CdiscApiResult<T>`) for all error scenarios (auth, network, HTTP, rate-limit, invalid-response).

**Public interface (factory):**

- `createCdiscApiService(config?, httpClient?, logger?): CdiscApiService`
  - `listCtPackages(): Promise<CdiscApiResult<CdiscCtPackage[]>>`
  - `listPackageCodelists(packageOid): Promise<CdiscApiResult<CdiscCtCodelist[]>>`
  - `listCodelistTerms(codelistOid, packageOid?): Promise<CdiscApiResult<CdiscCtTerm[]>>`

**Upstream:** CDISC Library REST API (external)
**Downstream:** `services/cdisc-ct-mapping-service.ts`
**Owning issues:** #44, #45

---

### `cdisc-ct-mapping-service.ts`

**Purpose:** Pure transform layer. Normalizes raw CDISC CT API payloads (`CdiscCtMappingInput`) into typed `_Codelists` row objects (`CrfCodelistsRow[]`), emitting structured warnings and errors. Also enforces lifecycle rules (insert / overwrite / skip-identical / prompt-user) on incoming vs. existing rows.

**Public interface:**

- `mapCdiscApiResponseToCrfCodelists(input): CdiscCtMappingResult`
- `applyCodelistLifecycle(existingRows, incomingRows): LifecycleResult`

**Upstream:** `services/cdisc-api-service.ts` (typed fetch outputs)
**Downstream:** `services/ct-import-service.ts`, `components/views/DictionarySidecar.tsx`
**Owning issues:** #93

---

### `migration-pipeline.ts`

**Purpose:** Shared pipeline contract for all CRF.xl ingestion and migration flows. Defines the unified diagnostic, status, projection, provenance, and manifest types consumed by every import tool. Ensures all import flows share a coherent `scan → map → preview → commit → summarize` contract.

**Public interface:**

- `ImportSeverity` — normalised severity type (`"error" | "warning" | "info"`)
- `ImportDiagnostic` — shared diagnostic record extended by all service-specific diagnostic types
- `ImportStatus` — pipeline gate status (`"clean" | "warnings" | "conflicts"`)
- `WorkbookProjection` — dry-run row projection across `_Study`, `_Forms`, `_Codelists`, and form-item sheets
- `ImportSummary` — gate model (status + diagnostics + canCommit) used by all import UIs
- `ImportSourceType` — source category (`"odm-xml" | "spreadsheet" | "cdisc-api"`)
- `ImportProvenance` — GxP provenance record with sourceId, sourceType, sourceVersion, importedAt, importedBy
- `ImportManifest` — full audit record combining provenance + summary + sheetsWritten + rowsWritten
- `createImportProvenance(sourceId, sourceType, sourceVersion?, importedBy?): ImportProvenance`
- `createImportManifest(provenance, summary, sheetsWritten, rowsWritten): ImportManifest`
- `persistImportManifest(manifest): void` — writes to sessionStorage key `"crf-xl-import-manifest"`
- `loadImportManifest(): ImportManifest | null` — reads from sessionStorage

**Upstream:** None (shared contract; no imports)
**Downstream:** `services/odm-import-service.ts`, `services/spreadsheet-ingestion-service.ts`, `components/views/OdmImportWizard.tsx`
**Owning issues:** #76 (epic), #63, #64, #93

---

### `ct-import-service.ts`

**Purpose:** Controlled terminology import service. Ingests mapped CDISC terminology payloads, converts them into workbook-ready codelist updates, emits import diagnostics and summary information using the shared import contracts, and supports gated write-back so terminology changes can be reviewed before commit.

**Public interface:**

- `importControlledTerminology(...): CtImportPackage`
- `projectCtImportToWorkbook(...): WorkbookProjection`
- `applyCtImportToWorkbook(workbook: ExcelJS.Workbook, importPackage: CtImportPackage): void`

**Upstream:** `services/cdisc-ct-mapping-service.ts`, `services/import-contracts.ts`, `core/types/`
**Downstream:** Controlled terminology import UI/workflows, Excel workbook write-back
**Owning issues:** #76 (epic), controlled terminology import backlog

---

### `odm-import-service.ts`

**Purpose:** ODM reverse parser. Parses a CDISC ODM XML string into a normalized `OdmImportPackage` containing a `StudyDesign`, structured diagnostics (extending `ImportDiagnostic`), a dry-run `OdmWorkbookProjection` (satisfying `WorkbookProjection`), a summary, and an optional provenance record. Write-back to an ExcelJS workbook is gated behind the absence of blocking diagnostics.

**Public interface:**

- `importOdmXml(xml: string): OdmImportPackage`
- `projectOdmImportToWorkbook(study: StudyDesign): OdmWorkbookProjection`
- `applyOdmImportToWorkbook(workbook: ExcelJS.Workbook, importPackage: OdmImportPackage): void`

**Upstream:** `services/migration-pipeline.ts`, `parser/validator.ts`, `core/types/`
**Downstream:** `components/views/OdmImportWizard.tsx`
**Owning issues:** #63, #76

---

### `spreadsheet-ingestion-service.ts`

**Purpose:** Pure-logic service for the Spreadsheet Ingestion Wizard. Defines the target-field catalog, auto-detects column→field mappings from legacy sheet headers, validates completed mappings, and builds a dry-run projection. `IngestionDiagnostic` extends `ImportDiagnostic`; `IngestionPreview.projectedRows` satisfies `WorkbookProjection` from the shared pipeline contract.

**Public interface:**

- `buildSheetScanResult(sheetName, rows, sampleSize?): SheetScanResult`
- `detectColumnMappings(columns, targetSheet): FieldMapping[]`
- `validateMappings(mappings, targetSheet): IngestionDiagnostic[]`
- `buildIngestionPreview(scanResult, mappings): IngestionPreview`
- `TARGET_FIELDS: TargetFieldDescriptor[]`

**Upstream:** `services/migration-pipeline.ts`
**Downstream:** `components/views/SpreadsheetIngestionWizard.tsx`
**Owning issues:** #64, #76

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

### `diff.ts`

Diff payload contracts: `StudyDiffReport`, `FormDiffEntry`, `ItemDiffEntry`, `CodelistDiffEntry`, `RuleDiffEntry`, `StudyMetadataDiff`, and the `DiffOperation` union type. Produced by `diff-engine.ts` and consumed by `StudyDiffView.tsx`.

---

## Legacy flat-file modules

These files at `src/taskpane/core/` root predate the modular architecture and are superseded by the modules above. They are retained for backward compatibility during the modular migration.

| File                | Superseded by                                                                  |
| ------------------- | ------------------------------------------------------------------------------ |
| `core/parser.ts`    | `core/parser/excel-parser.ts`                                                  |
| `core/generator.ts` | `core/generators/docx/docx-builder.ts`, `core/generators/cdisc/odm-builder.ts` |

---

## Working rule

Update this document whenever:

- A new module is added to `src/taskpane/core/`
- An expected-but-absent module is implemented (move it to the present section)
- A module's public interface changes materially
- An owning issue changes
