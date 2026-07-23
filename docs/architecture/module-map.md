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
**Owning issues:** #53, #118, #137

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

- `validateRules(rules: RuleDefinition[], study?: StudyDesign, options?: { isExport?: boolean; yieldControl?: () => Promise<void>; cancellationToken?: { isCancelled: () => boolean }; preCachedVariables?: Map<string, DataType> }): Promise<RuleValidationResult>`

**Upstream:** `rules-parser.ts`, `expression-validator.ts`, `core/types/`
**Downstream:** `validator.ts`, `odm-builder.ts`
**Owning issues:** #138

---

### `rules-parser.ts`

**Purpose:** Tokenizer and recursive descent parser for the rules logic grammar. Parses raw rule expressions into AST nodes, and workbook rows from the `_Rules` sheet into a standard `RuleDefinition[]` array. Includes caching mechanisms for parsed formulas to optimize repetitive evaluation.

**Public interface:**

- `tokenize(expression: string): Token[]`
- `parseRuleExpression(expression: string): ASTNode`
- `parseRulesSheetRows(rows: any[][], _studyVersion: string): { rules: RuleDefinition[]; errors: ParseError[] }`
- `clearFormulaCache(): void`

**Upstream:** `core/types/index.ts`
**Downstream:** `excel-parser.ts`, graph validator (`#138`), serialization
**Owning issues:** #137

---

### `baseline-workbook-parser.ts`

**Purpose:** Parses raw sheet value arrays (from an ExcelJS workbook) into a `StudyDesign`. Mirrors the logic of `excel-parser.ts` but operates on pre-loaded sheet values rather than the live Office.js Excel API context, enabling safe out-of-process parsing of external baseline workbooks.

**Public interface:**

- `parseWorkbookSheetValuesToStudyDesign(provider: WorkbookSheetValuesProvider, options?: ParseWorkbookSheetValuesOptions): Promise<StudyDesign>`

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

### `annotated-crf-pipeline.ts`

**Purpose:** Orchestrates the multi-stage generation of an Annotated CRF. Handles model snapshots, annotation resolution, verification, and artifact production (PDF/DOCX).

**Public interface:**

- `AnnotatedCrfPipeline.execute(): Promise<AnnotatedCrfPipelineResult>`

**Upstream:** `excel-parser.ts`, `annotation-service.ts`, `review-service.ts`, `acrf-renderer.ts`, `acrf-output-validator.ts`
**Downstream:** `AcrfPreview.tsx`, `ReviewerPackageService`
**Owning issues:** #184

---

### `cdisc/odm-builder.ts`

**Purpose:** Generates CDISC ODM XML from a validated `StudyDesign`. Supports serialization for `ConditionDef` and `MethodDef` based on rule ASTs.

**Public interface:**

- `generateOdmXml(design: StudyDesign): string`

**Upstream:** `core/types/clinical.ts`, `core/types/hierarchy.ts`
**Downstream:** `App.tsx` (download trigger), `ComplianceExportService`
**Owning issues:** #44, #139

---

### `docx/docx-builder.ts`

**Purpose:** Generates pixel-perfect Word documents from a validated `StudyDesign` using the `docx` library.

**Public interface:**

- `generateDocx(design: StudyDesign): Promise<Blob>`

**Upstream:** `core/types/clinical.ts`
**Downstream:** `App.tsx` (download trigger)
**Owning issues:** #56, #57

---

### `pdf/pdf-builder.ts`

**Purpose:** Generates PDF versions of the Annotated CRF, including study diffs and clinical annotations.

**Public interface:**

- `generatePdfBlob(study: StudyDesign, ...): Promise<Blob>`

**Upstream:** `pdf-export-adapter.ts`, `LinguisticService`
**Downstream:** `ComplianceExportService`, `AnnotatedCrfPipeline`
**Owning issues:** #279, #90

---

## Engine modules (`src/taskpane/core/engine/`)

### `chunking-engine.ts`

**Purpose:** Engine for chunking large operations.

**Public interface:**

- `ChunkingEngine`

**Owning issues:** #68

---

### `middlewares.ts`

**Purpose:** Middleware pipeline implementation.

**Public interface:**

- `createRetryMiddleware`
- `createLoggingMiddleware`

**Owning issues:** #68

---

## Service modules (`src/taskpane/core/services/`)

### `binding-service.ts`

**Purpose:** Centralized mechanism for workbook synchronization. Manages Office.js `onSelectionChanged` and `onActivated` listeners and normalizes selection data.

**Public interface:**

- `bindingService.subscribe(listener: SelectionChangeListener): () => void`
- `bindingService.performInternalOperation(operation: (context: Excel.RequestContext) => Promise<T>): Promise<T>`

**Upstream:** Office.js Excel API
**Downstream:** `DictionarySidecar.tsx`, `AnnotationPalette.tsx`
**Owning issues:** #165

---

### `annotation-service.ts`

**Purpose:** Manages clinical annotations using Excel `CustomXmlParts` for persistence and native comments for visual feedback. Supports logic for sheet mutations and Logical ID synchronization.

**Public interface:**

- `saveAnnotationsToStoreBatch(annotations: Annotation[]): Promise<void>`
- `refreshAnnotationHighlights(context: Excel.RequestContext): Promise<void>`

**Upstream:** Office.js Excel API, `core/types/annotation.ts`
**Downstream:** `AnnotationPaintbrushService`, `AnnotatedCrfPipeline`
**Owning issues:** #84

---

### `annotation-paintbrush-service.ts`

**Purpose:** Manages the bulk-apply workflow for annotations. Handles pending target accumulation, validation preview, and multi-step undo.

**Public interface:**

- `annotationPaintbrushService.executeBulkApply(): Promise<void>`
- `annotationPaintbrushService.undoLastOperation(): Promise<void>`

**Upstream:** `annotation-service.ts`, `annotation-validator.ts`
**Downstream:** `AnnotationPalette.tsx`
**Owning issues:** #84

---

### `authoring-service.ts`

**Purpose:** CRF authoring operations — adding/removing forms and items, codelist mutations, and study-level metadata edits.

**Public interface:** Authoring action functions consumed by `AuthoringView.tsx`.

**Upstream:** Office.js Excel API, `core/types/`
**Downstream:** `components/views/AuthoringView.tsx`
**Owning issues:** #83, #84

---

### `diff-engine.ts`

**Purpose:** Pure engine that semantically compares two `StudyDesign` objects to produce a `StudyDiffReport`.

**Public interface:**

- `diffStudyDesigns(baseline: StudyDesign, current: StudyDesign): StudyDiffReport`

**Upstream:** `core/types/diff.ts`
**Downstream:** `StudyDiffView.tsx`, `ComplianceExportService`
**Owning issues:** #129, #85

---

### `baseline-workbook-service.ts`

**Purpose:** Orchestrates the ingestion of external baseline workbooks using `exceljs` and `baseline-workbook-parser.ts`.

**Public interface:**

- `parseBaselineWorkbookFile(file: File): Promise<StudyDesign>`

**Upstream:** `baseline-workbook-parser.ts`
**Downstream:** `RegistryView.tsx`
**Owning issues:** #130, #85

---

### `migration-pipeline.ts`

**Purpose:** Orchestrates imports from multiple sources (ODM, spreadsheets, etc.) into the current workspace.

**Public interface:**

- `createImportManifest`
- `createImportProvenance`
- `persistImportManifest`
- `loadImportManifest`

**Owning issues:** #139

---

### `odm-import-service.ts`

**Purpose:** Handles CDISC ODM XML import processing and projection.

**Public interface:**

- `projectOdmImportToWorkbook`
- `applyOdmImportToWorkbook`

**Owning issues:** #139

---

### `review-service.ts`

**Purpose:** Manages clinical reviewer comments using `CustomXmlParts` with namespace `http://schemas.crf-xl.com/review`.

**Public interface:**

- `saveComment(comment: ReviewerComment): Promise<void>`
- `loadComments(): Promise<ReviewerComment[]>`
- `ReviewService`

**Upstream:** Office.js Excel API, `core/types/reviewer.ts`
**Downstream:** `ReviewView.tsx`, `AnnotatedCrfPipeline`
**Owning issues:** #57

---

### `reviewer-package-service.ts`

**Purpose:** Orchestrates the generation of a multi-artifact ZIP archive for reviewers (PDF, manifest, report, summary).

**Public interface:**

- `ReviewerPackageService.createReviewerPackage(result: AnnotatedCrfPipelineResult): Promise<Blob>`

**Upstream:** `zip-writer.ts`, `annotated-crf-pipeline.ts`
**Downstream:** `AcrfPreview.tsx`
**Owning issues:** #56

---

### `cdisc-api-service.ts`

**Purpose:** CDISC Library API client handling authentication, rate-limiting, and typed responses.

**Public interface:**

- `listCtPackages(): Promise<CdiscApiResult<CdiscCtPackage[]>>`

**Upstream:** CDISC Library API
**Downstream:** `cdisc-ct-mapping-service.ts`
**Owning issues:** #44, #45

---

### `cdisc-ct-mapping-service.ts`

**Purpose:** Normalizes CDISC CT API payloads into typed `_Codelists` row objects.

**Public interface:**

- `mapCdiscApiResponseToCrfCodelists(input): CdiscCtMappingResult`

**Upstream:** `cdisc-api-service.ts`
**Downstream:** `ct-import-service.ts`
**Owning issues:** #93

---

### `compliance-governance-service.ts`

**Purpose:** Environment compliance status and governance orchestration.

**Public interface:**

- `complianceGovernanceService`

**Owning issues:** #28

---

### `dictionary-service.ts`

**Purpose:** Manages codelist and dictionary write-back to the `_Codelists` sheet.

**Public interface:**

- `saveDictionary(context: Excel.RequestContext, codelist: CdiscCodelist): Promise<void>`
- `CodelistItem`
- `CodelistGroup`

**Upstream:** Office.js Excel API
**Downstream:** `DictionarySidecar.tsx`
**Owning issues:** #46, #93, #41

---

### `linguistics-service.ts`

**Purpose:** Locale-aware linguistic engine providing normalization and fallback logic for multilingual metadata.

**Public interface:**

- `LinguisticService.getExportTranslations(text: TranslatedText, options: ExportOptions): string`

**Upstream:** `core/types/linguistics.ts`
**Downstream:** `pdf-builder.ts`, `odm-builder.ts`, `docx-builder.ts`
**Owning issues:** #39, #40

---

### `compliance-export-service.ts`

**Purpose:** Orchestrates compliance-grade exports, including digital signatures and ODM diagnostics.

**Public interface:**

- `ComplianceExportService.createExportPackage(currentStudy: StudyDesign, baselineStudy: StudyDesign | null, validationIssues: any[], options?: any): Promise<Blob>`
- `ComplianceExportService.registerAdapter(adapter: ExportAdapter)`
- `ExportAdapterContext`
- `ExportAdapterResult`
- `ExportAdapter`

**Upstream:** `odm-builder.ts`, `pdf-builder.ts`, `docx-builder.ts`, `zip-writer.ts`
**Downstream:** `ComplianceGovernanceView.tsx`
**Owning issues:** #28

---

### `standard-export-adapters.ts`

**Purpose:** Provides format-specific export adapters (Docx, Pdf, OdmXml) for the compliance export service orchestration loop.

**Public interface:**

- `DocxExportAdapter`
- `PdfExportAdapter`
- `OdmXmlExportAdapter`
- `registerStandardAdapters()`

**Upstream:** `compliance-export-service.ts`, `odm-builder.ts`, `pdf-builder.ts`, `docx-builder.ts`
**Downstream:** `App.tsx`
**Owning issues:** #28

---

### `recovery-storage.ts`

**Purpose:** Manages localStorage recovery snapshots. Stores validation summary, parsed study summary, UI context, and snapshot metadata. Excludes raw workbook data and credentials. Snapshots auto-expire after 7 days.

**Public interface:**

- `saveRecoverySnapshot(snapshot: RecoverySnapshot): void`
- `loadRecoverySnapshot(): RecoverySnapshot | null`
- `clearExpiredSnapshots(): void`
- `summarizeStudyDesign`
- `summarizeValidation`
- `toRecoveryIssues`
- `createRecoverySnapshot`
- `hasWorkbookChanged`

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

**Purpose:** Normalizes Office.js errors into application-level diagnostics with recovery suggestions.

**Public interface:**

- `handleOfficeError(error: unknown): AppError`
- `classifyOfficeError`
- `createOfficeDiagnostic`

**Upstream:** Office.js API
**Downstream:** All Excel-interacting services
**Owning issues:** #68

---

### `vault-service.ts`

**Purpose:** Isomorphic SDK wrapper and in-memory simulator mode support for local development. Intercepts Vault requests in-memory if unconfigured or explicitly configured with mock parameters, and otherwise proxies requests to the Vault service.

**Public interface:**

- `VaultService`
- `resetMockVaultStore()`

**Upstream:** `packages/vault-sdk`, `DiagnosticError`, `appOrchestrator`, `logger`
**Downstream:** `RegistryView.tsx`, `App.tsx`
**Owning issues:** #28

---

## Registry and Factory modules (`src/taskpane/core/registry/`, `src/taskpane/core/factory/`)

### `sheet-metadata-registry.ts`

**Purpose:** Centralized definition of system sheet names, header structures, and default data templates.

**Public interface:** `SHEET_NAMES`, `SHEET_HEADERS`, `getDefaultData()`

**Owning issues:** #292

---

### `sheet-factory.ts`

**Purpose:** Utility for workbook sheet creation and formatting.

**Public interface:** `createOrClearSystemSheet`, `upgradeSystemSheetsToTables`

**Owning issues:** #292

---

## Validator modules (`src/taskpane/core/validators/`)

### `clinical-pipeline.ts`

**Purpose:** Clinical validation pipeline orchestrator.

**Public interface:**

- `ClinicalValidationPipeline`

**Owning issues:** #184

---

### `acrf-output-validator.ts`

**Purpose:** Verifies that the generated Annotated CRF document faithfully reflects the source study design.

**Public interface:** `verifyAnnotatedCrf(study: StudyDesign, doc: AnnotatedCrfDocument): AcrfVerificationResult`

**Owning issues:** #184

---

### `annotation-validator.ts`

**Purpose:** Enforces correctness for clinical annotations, including conflict detection and repair policy mapping.

**Public interface:** `validateAnnotationTarget(range: Excel.Range): Promise<AnnotationValidationIssue[]>`

**Owning issues:** #84

---

## Utility modules (`src/taskpane/core/utils/`)

### `escape-utils.ts`

**Purpose:** Centralized escaping and decoding helpers for clinical study configurations, CDISC ODM XML, and HTML/PDF exports. Consolidates historical character mapping quirks for bug-for-bug preservation.

**Public interface:**

- `escapeRegExp(value: string): string`
- `escapeXml(unsafe: string): string`
- `escapeHtml(unsafe: string): string`
- `decodeXml(value: string): string`

**Owning issues:** #433

---

## UI Component modules (`src/taskpane/components/ui/`)

### `Button.tsx`

**Purpose:** Centralized button wrapper.

**Public interface:** `Button`

**Owning issues:** #313

---

### `UniversalStepper.tsx`

**Purpose:** Navigation architecture for multi-step flows.

**Public interface:** `UniversalStepper`

**Owning issues:** #313

---

### `zip-writer.ts`

**Purpose:** Pure TypeScript implementation for generating ZIP archives without external native dependencies.

**Public interface:** `ZipWriter.addFile(name, data): Promise<void>`, `ZipWriter.generate(): Blob`

**Owning issues:** #28

---

### `locale-utils.ts`

**Purpose:** Localized number and date parsing/formatting utilities.

**Public interface:** `formatNumber`, `parseNumber`, `formatDate`, `parseDate`

**Owning issues:** #39

---

## Type modules (`src/taskpane/core/types/`)

### `clinical.ts`
Core CRF metadata types: `StudyDesign`, `CrfForm`, `CrfItem`, `CrfCodelist`.

### `hierarchy.ts`
Hierarchical structure types: OID registry, parent-child metadata.

### `annotated-crf.ts`
Types for the aCRF pipeline: `AnnotatedCrfDocument`, `PipelineDiagnostic`, `AcrfVerificationResult`.

### `annotation.ts`
Clinical annotation interfaces (SDTM, ADAM, Origin) and target types.

### `rules-ast.ts`
AST node types for the rules logic grammar.

### `diff.ts`
Diff payload contracts: `StudyDiffReport`, `FormDiffEntry`.

### `validation.ts`
Validation types: `ValidationIssue`, `ValidationLevel`, `ValidationResult`, `ParseResult`.

### `ui.ts`
UI state types: navigation context, filter state, view mode, sidecar state.

### `enums.ts`
Enumerated values: data types, validation levels, form types, status values.

### `common.ts`
Shared utility types: localized strings, OID references, generic result wrappers.

---

## Legacy flat-file modules

These files at `src/taskpane/core/` root are superseded by modular implementations.

| File | Superseded by |
| --- | --- |
| `core/parser.ts` | `core/parser/excel-parser.ts` |
| `core/generator.ts` | `core/generators/docx/docx-builder.ts`, `core/generators/cdisc/odm-builder.ts` |

---

## Expected-but-absent modules

| Expected module | Purpose | Blocking Issue | Planned Location |
| --- | --- | --- | --- |
| `services/rules-runtime.ts` | Real-time evaluation of CRF rules in the sidecar. | #137 | `src/taskpane/core/services/` |
| `parser/vlm-parser.ts` | Parsing Value Level Metadata sheets. | #92 | `src/taskpane/core/parser/` |

---

## Working rule

Update this document whenever:

- A new module is added to `src/taskpane/core/`
- An expected-but-absent module is implemented (move it to the present section)
- A module's public interface changes materially
- An owning issue changes

