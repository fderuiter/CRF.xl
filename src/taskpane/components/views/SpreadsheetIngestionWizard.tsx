/**
 * @issue #28
 */
/**
 * ============================================================================
 * SpreadsheetIngestionWizard.tsx
 * ============================================================================
 * 7-stage interactive wizard for ingesting legacy Excel CRFs into CRF.xl.
 *
 * Stages (authoritative per issue #64):
 *  1. Source selection    – pick the source sheet from the active workbook
 *  2. Workbook scan       – read headers + sample rows from the sheet
 *  3. Structure detection – confirm detected structure type
 *  4. Field / sheet mapping – map source columns to CRF.xl target fields
 *  5. Validation preview  – review diagnostics before committing
 *  6. Import confirmation – mandatory dry-run review
 *  7. Post-import summary – results after commit
 */

/* global Excel */
import * as React from "react";
import { speculativeSyncManager, getPredictedStudyDesign } from "../../core/services/speculative-sync-service";
import {
  Badge,
  Body1,
  Button,
  Card,
  Dropdown,
  Field,
  MessageBar,
  MessageBarBody,
  Option,
  ProgressBar,
  Spinner,
  Text,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import {
  buildIngestionPreview,
  buildSheetScanResult,
  detectColumnMappings,
  mapRow,
  ColumnCandidate,
  FieldMapping,
  IngestionPreview,
  SheetScanResult,
  TARGET_FIELDS,
  TargetField,
  TargetSheet,
} from "../../core/services/spreadsheet-ingestion-service";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type WizardStage =
  | "source-selection"
  | "workbook-scan"
  | "structure-detection"
  | "field-mapping"
  | "validation-preview"
  | "import-confirmation"
  | "post-import-summary";

interface WizardState {
  stage: WizardStage;
  availableSheets: string[];
  selectedSheet: string | null;
  scanResult: SheetScanResult | null;
  confirmedStructure: TargetSheet | null;
  mappings: FieldMapping[];
  preview: IngestionPreview | null;
  /** Name of the form sheet to write form-item rows into (stage 6). */
  targetFormSheet: string | null;
  importResult: {
    success: boolean;
    rowsWritten: number;
    targetSheet: string;
    message: string;
    warnings: number;
  } | null;
  syncProgress: {
    processed: number;
    total: number;
    cancelRequested: boolean;
  } | null;
  isProcessing: boolean;
  error: string | null;
}

const INITIAL_STATE: WizardState = {
  stage: "source-selection",
  availableSheets: [],
  selectedSheet: null,
  scanResult: null,
  confirmedStructure: null,
  mappings: [],
  preview: null,
  targetFormSheet: null,
  importResult: null,
  syncProgress: null,
  isProcessing: false,
  error: null,
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  card: {
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusXLarge,
    padding: "20px",
    boxShadow: tokens.shadow4,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    justifyContent: "space-between",
  },
  stageTitle: {
    fontSize: tokens.fontSizeBase400,
    fontWeight: tokens.fontWeightBold,
  },
  stageBadge: {
    flexShrink: 0,
  },
  desc: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    lineHeight: "1.5",
  },
  sheetList: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    maxHeight: "240px",
    overflowY: "auto",
  },
  sheetItem: {
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    padding: "8px 12px",
    cursor: "pointer",
    fontSize: tokens.fontSizeBase300,
    backgroundColor: tokens.colorNeutralBackground2,
  },
  sheetItemSelected: {
    border: `2px solid ${tokens.colorCompoundBrandStroke}`,
    backgroundColor: tokens.colorBrandBackground2,
  },
  mappingRow: {
    display: "grid",
    gridTemplateColumns: "1fr auto 1fr",
    alignItems: "center",
    gap: "8px",
  },
  mappingLabel: {
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  mappingArrow: {
    color: tokens.colorNeutralForeground3,
    fontWeight: tokens.fontWeightBold,
  },
  mappingList: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    maxHeight: "320px",
    overflowY: "auto",
  },
  actions: {
    display: "flex",
    gap: "8px",
    justifyContent: "space-between",
    flexWrap: "wrap",
  },
  diagItem: {
    display: "flex",
    alignItems: "flex-start",
    gap: "8px",
    fontSize: tokens.fontSizeBase200,
    lineHeight: "1.5",
  },
  previewTable: {
    overflowX: "auto",
    maxHeight: "220px",
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
  },
  table: {
    borderCollapse: "collapse",
    width: "100%",
    fontSize: tokens.fontSizeBase100,
  },
  th: {
    backgroundColor: tokens.colorNeutralBackground3,
    padding: "4px 8px",
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    textAlign: "left",
    fontWeight: tokens.fontWeightBold,
    whiteSpace: "nowrap",
  },
  td: {
    padding: "4px 8px",
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    whiteSpace: "nowrap",
    maxWidth: "120px",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  stepIndicator: {
    display: "flex",
    gap: "4px",
    justifyContent: "center",
  },
  stepDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    backgroundColor: tokens.colorNeutralStroke1,
  },
  stepDotActive: {
    backgroundColor: tokens.colorBrandBackground,
  },
  stepDotDone: {
    backgroundColor: tokens.colorPaletteGreenBackground3,
  },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "8px",
  },
  summaryItem: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    padding: "8px",
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: tokens.borderRadiusMedium,
  },
  summaryValue: {
    fontSize: tokens.fontSizeBase500,
    fontWeight: tokens.fontWeightBold,
    color: tokens.colorBrandForeground1,
  },
  summaryLabel: {
    fontSize: tokens.fontSizeBase100,
    color: tokens.colorNeutralForeground3,
  },
  structureButtonGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  structureButton: {
    justifyContent: "flex-start",
    width: "100%",
  },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STAGE_LABELS: Record<WizardStage, string> = {
  "source-selection": "1 / 7  Source Selection",
  "workbook-scan": "2 / 7  Workbook Scan",
  "structure-detection": "3 / 7  Structure Detection",
  "field-mapping": "4 / 7  Field Mapping",
  "validation-preview": "5 / 7  Validation Preview",
  "import-confirmation": "6 / 7  Import Confirmation",
  "post-import-summary": "7 / 7  Post-import Summary",
};

const STAGE_ORDER: WizardStage[] = [
  "source-selection",
  "workbook-scan",
  "structure-detection",
  "field-mapping",
  "validation-preview",
  "import-confirmation",
  "post-import-summary",
];

const STRUCTURE_LABELS: Record<TargetSheet, string> = {
  form_item: "Form Items (CRF variables)",
  forms_registry: "Forms Registry (_Forms)",
  codelists: "Codelists (_Codelists)",
};

const STRUCTURE_ICONS: Record<TargetSheet, string> = {
  form_item: "📋",
  forms_registry: "📁",
  codelists: "📖",
};

function confidenceBadgeColor(
  c: FieldMapping["confidence"]
): "success" | "warning" | "danger" {
  if (c === "high") return "success";
  if (c === "medium") return "warning";
  return "danger";
}

function confidenceLabel(c: FieldMapping["confidence"]): string {
  if (c === "high") return "High";
  if (c === "medium") return "Medium";
  return "Unresolved";
}

function detectedStructureToTargetSheet(
  detected: SheetScanResult["detectedStructure"]
): TargetSheet {
  if (detected === "codelists") return "codelists";
  if (detected === "forms_registry") return "forms_registry";
  return "form_item";
}

// System sheets that should not be offered as source sheets.
const SYSTEM_SHEETS = new Set([
  "_Study",
  "_Forms",
  "_Schedule",
  "_Codelists",
  "_Methods",
  "_VLM",
  "_Rules",
]);

// ---------------------------------------------------------------------------
// Component props
// ---------------------------------------------------------------------------

export interface SpreadsheetIngestionWizardProps {
  onClose: () => void;
  legacyStudy?: any;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const SpreadsheetIngestionWizard: React.FC<SpreadsheetIngestionWizardProps> = ({
  onClose,
  legacyStudy,
}) => {
  const styles = useStyles();
  
  const [state, setState] = React.useState<WizardState>(() => {
    if (legacyStudy) {
      return {
        ...INITIAL_STATE,
        stage: "validation-preview", // Repurpose validation-preview for legacy upgrade
        preview: {
          mappings: [],
          diagnostics: [],
          canCommit: true,
          projectedRows: { formItemRows: [], formsRows: [], codelistRows: [] },
        },
      };
    }
    return INITIAL_STATE;
  });
  const cancelRequestedRef = React.useRef(false);

  // Derived helpers
  const stageIndex = STAGE_ORDER.indexOf(state.stage);

  React.useEffect(() => {
    if (legacyStudy && state.stage === "validation-preview" && !state.importResult) {
      import("../../core/services/spreadsheet-ingestion-service").then((mod) => {
        const { upgradedStudy, diagnostics } = mod.upgradeLegacyStudyDesign(legacyStudy);
        patch({
          preview: {
            mappings: [],
            diagnostics,
            canCommit: true,
            projectedRows: { formItemRows: [], formsRows: [], codelistRows: [] },
            upgradedStudy, // We will use this in commit
          } as any
        });
      });
    }
  }, [legacyStudy]);

  // -------------------------------------------------------------------------
  // Utility: patch state
  // -------------------------------------------------------------------------
  const patch = (partial: Partial<WizardState>) =>
    setState((current) => ({ ...current, ...partial }));

  // -------------------------------------------------------------------------
  // Stage 1 helpers: load available sheets on mount
  // -------------------------------------------------------------------------
  React.useEffect(() => {
    const loadSheets = async () => {
      patch({ isProcessing: true, error: null });
      try {
        const sheets = await Excel.run(async (ctx) => {
          const ws = ctx.workbook.worksheets;
          ws.load("items/name");
          await ctx.sync();
          return ws.items.map((s) => s.name);
        });
        const nonSystem = sheets.filter((name) => !SYSTEM_SHEETS.has(name));
        patch({
          availableSheets: nonSystem,
          isProcessing: false,
        });
      } catch (e) {
        patch({
          error: "Could not read workbook sheets. Ensure a workbook is open.",
          isProcessing: false,
        });
      }
    };
    void loadSheets();
  }, []);

  // -------------------------------------------------------------------------
  // Stage 2: scan selected sheet
  // -------------------------------------------------------------------------
  const handleScan = async () => {
    if (!state.selectedSheet) return;
    patch({ isProcessing: true, error: null, stage: "workbook-scan" });
    try {
      let rawRows: string[][] = [];
      let totalRows = 0;
      await Excel.run(async (ctx) => {
        const sheet = ctx.workbook.worksheets.getItem(state.selectedSheet!);
        const used = sheet.getUsedRange();
        used.load(["rowCount", "columnCount"]);
        await ctx.sync();
        totalRows = used.rowCount > 0 ? used.rowCount - 1 : 0; // -1 for header
        const rowsToRead = Math.min(50, used.rowCount);
        if (rowsToRead > 0) {
          const range = sheet.getRangeByIndexes(0, 0, rowsToRead, used.columnCount);
          range.load("values");
          await ctx.sync();
          rawRows = range.values as string[][];
        }
      });
      const scanResult = buildSheetScanResult(state.selectedSheet, rawRows, 5, totalRows);
      const confirmedStructure = detectedStructureToTargetSheet(scanResult.detectedStructure);
      patch({
        scanResult,
        confirmedStructure,
        isProcessing: false,
        stage: "structure-detection",
      });
    } catch (e) {
      patch({
        error: `Could not read sheet "${state.selectedSheet}". It may be protected or empty.`,
        isProcessing: false,
      });
    }
  };

  // -------------------------------------------------------------------------
  // Stage 3 → 4: confirm structure and generate initial mappings
  // -------------------------------------------------------------------------
  const handleConfirmStructure = (targetSheet: TargetSheet) => {
    if (!state.scanResult) return;
    const mappings = detectColumnMappings(state.scanResult.columnCandidates, targetSheet);
    patch({
      confirmedStructure: targetSheet,
      mappings,
      stage: "field-mapping",
    });
  };

  // -------------------------------------------------------------------------
  // Stage 4: user overrides a column mapping
  // -------------------------------------------------------------------------
  const handleMappingChange = (
    targetField: TargetField,
    columnIndex: number | null
  ) => {
    setState((current) => {
      const col =
        columnIndex !== null
          ? current.scanResult?.columnCandidates.find((c) => c.columnIndex === columnIndex) ?? null
          : null;
      return {
        ...current,
        mappings: current.mappings.map((m) =>
          m.targetField === targetField
            ? {
                ...m,
                sourceColumn: col,
                confidence: col ? "high" : "unresolved",
                isUserOverridden: true,
              }
            : m
        ),
      };
    });
  };

  // -------------------------------------------------------------------------
  // Stage 4 → 5: build validation preview
  // -------------------------------------------------------------------------
  const handleBuildPreview = () => {
    if (!state.scanResult || !state.confirmedStructure) return;
    const preview = buildIngestionPreview(state.scanResult, state.mappings);
    patch({ preview, stage: "validation-preview" });
  };

  // -------------------------------------------------------------------------
  // Stage 5 → 6: confirm and move to dry-run review
  // -------------------------------------------------------------------------
  const handleProceedToConfirmation = () => {
    patch({ stage: "import-confirmation" });
  };

  // -------------------------------------------------------------------------
  // Stage 6: commit the import to the active workbook
  // -------------------------------------------------------------------------
  const handleCommit = async () => {
    if (!state.preview) return;
    
    if (legacyStudy) {
      // For legacy upgrades, update the study design state globally
      import("../../core/services/validation-engine").then(({ backgroundValidationEngine }) => {
        backgroundValidationEngine.updateState(() => ({
          study: (state.preview as any).upgradedStudy,
        }));
        patch({
          importResult: {
            success: true,
            rowsWritten: 0,
            targetSheet: "Memory",
            message: "Legacy study upgraded successfully in session.",
            warnings: 0,
          },
          stage: "post-import-summary",
        });
      });
      return;
    }

    if (!state.confirmedStructure || !state.scanResult) return;
    cancelRequestedRef.current = false;
    patch({
      isProcessing: true,
      error: null,
      syncProgress: { processed: 0, total: state.scanResult.rowCount, cancelRequested: false }
    });

    try {
      const { mappings } = state.preview;
      const totalRows = state.scanResult.rowCount;
      const pageSize = 500;
      let rowsWritten = 0;
      let targetSheetName = "";

      const maxColIndex = Math.max(
        0,
        ...state.scanResult.columnCandidates.map((c) => c.columnIndex)
      );
      const colCount = maxColIndex + 1;

      for (let i = 0; i < totalRows; i += pageSize) {
        // Provide an opportunity to cancel and yield to UI thread
        await new Promise((resolve) => setTimeout(resolve, 10));

        if (cancelRequestedRef.current) break;

        const currentChunkSize = Math.min(pageSize, totalRows - i);

        await Excel.run(async (ctx) => {
          const sheets = ctx.workbook.worksheets;
          const sourceSheet = sheets.getItem(state.selectedSheet!);
          // +1 to skip header row
          const sourceRange = sourceSheet.getRangeByIndexes(i + 1, 0, currentChunkSize, colCount);
          sourceRange.load("values");
          await ctx.sync();

          const sourceRows = sourceRange.values as string[][];
          const mappedRows = sourceRows.map((r) =>
            mapRow(r, mappings, state.confirmedStructure!)
          );

          if (state.confirmedStructure === "codelists") {
            const clSheet = sheets.getItem("_Codelists");
            const used = clSheet.getUsedRange();
            used.load("rowCount");
            await ctx.sync();
            const startRow = used.rowCount > 0 ? used.rowCount : 0;
            const range = clSheet.getRangeByIndexes(startRow, 0, mappedRows.length, 4);
            range.values = mappedRows as string[][];
            targetSheetName = "_Codelists";
          } else if (state.confirmedStructure === "forms_registry") {
            const formsSheet = sheets.getItem("_Forms");
            const used = formsSheet.getUsedRange();
            used.load("rowCount");
            await ctx.sync();
            const startRow = used.rowCount > 0 ? used.rowCount : 0;
            const range = formsSheet.getRangeByIndexes(startRow, 0, mappedRows.length, 4);
            range.values = mappedRows as string[][];
            targetSheetName = "_Forms";
          } else if (state.confirmedStructure === "form_item") {
            const formSheetName = state.targetFormSheet ?? state.selectedSheet ?? "ImportedForm";
            let formSheet = sheets.getItemOrNullObject(formSheetName);
            await ctx.sync();
            if (formSheet.isNullObject) {
              formSheet = sheets.add(formSheetName);
              // Add headers if new sheet
              const headers = [
                "Variable Name", "Label", "Variable Type", "Required", "Length", "Significant Digits",
                "Minimum", "Maximum", "Show If", "Codelist ID", "Origin", "Method OID", "SDTM Domain",
                "SDTM Variable", "Comment",
              ];
              formSheet.getRangeByIndexes(0, 0, 1, headers.length).values = [headers];
            }
            const used = formSheet.getUsedRange();
            used.load("rowCount");
            await ctx.sync();
            const startRow = used.rowCount > 0 ? used.rowCount : 0;
            const range = formSheet.getRangeByIndexes(startRow, 0, mappedRows.length, mappedRows[0].length);
            range.values = mappedRows as string[][];
            targetSheetName = formSheetName;
          }

          await ctx.sync();
        });

        rowsWritten += currentChunkSize;
        setState((current) => {
          if (current.syncProgress) {
            return {
              ...current,
              syncProgress: { ...current.syncProgress, processed: rowsWritten },
            };
          }
          return current;
        });
      }

      // Check if completely cancelled
      if (cancelRequestedRef.current) {
        patch({
          isProcessing: false,
          syncProgress: null,
          importResult: {
            success: false,
            rowsWritten,
            targetSheet: targetSheetName,
            message: `Partial import: ${rowsWritten} row(s) imported before cancellation.`,
            warnings: (state.preview.diagnostics || []).filter(
              (d) => d.severity === "warning"
            ).length,
          },
          stage: "post-import-summary"
        });
        return;
      }

      const warnings = (state.preview.diagnostics || []).filter(
        (d) => d.severity === "warning"
      ).length;

      patch({
        importResult: {
          success: true,
          rowsWritten,
          targetSheet: targetSheetName,
          message: `Successfully imported ${rowsWritten} row(s) into ${targetSheetName}.`,
          warnings,
        },
        isProcessing: false,
        syncProgress: null,
        stage: "post-import-summary",
      });
    } catch (e) {
      patch({
        error: `Import failed: ${e instanceof Error ? e.message : String(e)}`,
        isProcessing: false,
        syncProgress: null,
      });
    }
  };

  // -------------------------------------------------------------------------
  // Render helpers
  // -------------------------------------------------------------------------
  const renderStepIndicator = () => (
    <div className={styles.stepIndicator}>
      {STAGE_ORDER.map((s, i) => (
        <div
          key={s}
          className={`${styles.stepDot} ${
            i < stageIndex
              ? styles.stepDotDone
              : i === stageIndex
              ? styles.stepDotActive
              : ""
          }`}
        />
      ))}
    </div>
  );

  // -------------------------------------------------------------------------
  // Stage renderers
  // -------------------------------------------------------------------------

  const renderSourceSelection = () => (
    <>
      <Body1 className={styles.desc}>
        Select a sheet from the current workbook to ingest. System sheets (prefixed with _) are
        excluded.
      </Body1>

      {state.isProcessing && <Spinner size="tiny" label="Loading sheets…" />}

      {!state.isProcessing && state.availableSheets.length === 0 && (
        <MessageBar intent="warning">
          <MessageBarBody>
            No non-system sheets found. Open a legacy CRF file or add data sheets to this workbook.
          </MessageBarBody>
        </MessageBar>
      )}

      <div className={styles.sheetList}>
        {state.availableSheets.map((name) => (
          <div
            key={name}
            className={`${styles.sheetItem} ${
              state.selectedSheet === name ? styles.sheetItemSelected : ""
            }`}
            onClick={() => patch({ selectedSheet: name })}
            role="option"
            aria-selected={state.selectedSheet === name}
          >
            📄 {name}
          </div>
        ))}
      </div>

      <div className={styles.actions}>
        <Button appearance="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button
          appearance="primary"
          disabled={!state.selectedSheet || state.isProcessing}
          onClick={handleScan}
        >
          Scan Sheet →
        </Button>
      </div>
    </>
  );

  const renderWorkbookScan = () => (
    <>
      <Spinner size="small" label={`Scanning "${state.selectedSheet}"…`} />
    </>
  );

  const renderStructureDetection = () => {
    if (!state.scanResult) return null;
    const { scanResult } = state;
    return (
      <>
        <Body1 className={styles.desc}>
          Scanned <strong>{scanResult.sheetName}</strong>: found{" "}
          <strong>{scanResult.columnCandidates.length}</strong> column(s) and{" "}
          <strong>{scanResult.rowCount}</strong> data row(s).
        </Body1>

        <Text style={{ fontSize: tokens.fontSizeBase200, fontWeight: tokens.fontWeightSemibold }}>
          Detected columns:{" "}
          {scanResult.columnCandidates.map((c) => c.columnName).join(", ") || "none"}
        </Text>

        <Body1 className={styles.desc}>
          CRF.xl detected that this sheet most likely contains{" "}
          <strong>
            {STRUCTURE_LABELS[detectedStructureToTargetSheet(scanResult.detectedStructure)]}
          </strong>
          . Confirm or select the correct structure type:
        </Body1>

        <div className={styles.structureButtonGroup}>
          {(["form_item", "forms_registry", "codelists"] as TargetSheet[]).map((ts) => (
            <Button
              key={ts}
              appearance={state.confirmedStructure === ts ? "primary" : "outline"}
              className={styles.structureButton}
              onClick={() => patch({ confirmedStructure: ts })}
            >
              {STRUCTURE_ICONS[ts]} {STRUCTURE_LABELS[ts]}
            </Button>
          ))}
        </div>

        <div className={styles.actions}>
          <Button
            appearance="secondary"
            onClick={() => patch({ stage: "source-selection" })}
          >
            ← Back
          </Button>
          <Button
            appearance="primary"
            disabled={!state.confirmedStructure}
            onClick={() =>
              state.confirmedStructure && handleConfirmStructure(state.confirmedStructure)
            }
          >
            Confirm & Map Fields →
          </Button>
        </div>
      </>
    );
  };

  const renderFieldMapping = () => {
    if (!state.scanResult) return null;
    const columns = state.scanResult.columnCandidates;
    const columnsWithNone: Array<{ label: string; value: string }> = [
      { label: "(not mapped)", value: "-1" },
      ...columns.map((c) => ({
        label: `${c.columnName} (col ${c.columnIndex + 1})`,
        value: String(c.columnIndex),
      })),
    ];

    return (
      <>
        <Body1 className={styles.desc}>
          Map source columns to CRF.xl target fields. Auto-detected suggestions are shown.
          Override any mapping using the dropdowns. Required fields are marked with *.
        </Body1>

        <div className={styles.mappingList}>
          {state.mappings.map((mapping) => {
            const descriptor = TARGET_FIELDS.find((f) => f.field === mapping.targetField)!;
            const currentValue =
              mapping.sourceColumn !== null ? String(mapping.sourceColumn.columnIndex) : "-1";
            return (
              <div key={mapping.targetField} className={styles.mappingRow}>
                <span className={styles.mappingLabel}>
                  {descriptor.label}
                  {descriptor.required && (
                    <span style={{ color: tokens.colorPaletteRedForeground1 }}>*</span>
                  )}
                  <Badge
                    size="small"
                    color={confidenceBadgeColor(mapping.confidence)}
                    appearance="tint"
                  >
                    {confidenceLabel(mapping.confidence)}
                  </Badge>
                </span>
                <span className={styles.mappingArrow}>←</span>
                <Field>
                  <Dropdown
                    value={
                      columnsWithNone.find((c) => c.value === currentValue)?.label ??
                      "(not mapped)"
                    }
                    onOptionSelect={(_ev, data) => {
                      const idx = data.optionValue ? parseInt(data.optionValue, 10) : -1;
                      handleMappingChange(
                        mapping.targetField,
                        idx === -1 ? null : idx
                      );
                    }}
                  >
                    {columnsWithNone.map((c) => (
                      <Option key={c.value} value={c.value}>
                        {c.label}
                      </Option>
                    ))}
                  </Dropdown>
                </Field>
              </div>
            );
          })}
        </div>

        {/* Target form sheet selector for form_item ingestion */}
        {state.confirmedStructure === "form_item" && (
          <Field label="Target form sheet name (will be created if absent)">
            <Dropdown
              value={state.targetFormSheet ?? state.selectedSheet ?? ""}
              onOptionSelect={(_ev, data) => patch({ targetFormSheet: data.optionValue ?? null })}
            >
              {[
                state.selectedSheet ?? "",
                ...state.availableSheets.filter((s) => s !== state.selectedSheet),
              ]
                .filter(Boolean)
                .map((s) => (
                  <Option key={s} value={s}>
                    {s}
                  </Option>
                ))}
            </Dropdown>
          </Field>
        )}

        <div className={styles.actions}>
          <Button
            appearance="secondary"
            onClick={() => patch({ stage: "structure-detection" })}
          >
            ← Back
          </Button>
          <Button appearance="primary" onClick={handleBuildPreview}>
            Validate Mappings →
          </Button>
        </div>
      </>
    );
  };

  const renderValidationPreview = () => {
    const { preview } = state;
    if (!preview) return null;
    const errors = preview.diagnostics.filter((d) => d.severity === "error");
    const warnings = preview.diagnostics.filter((d) => d.severity === "warning");
    return (
      <>
        {errors.length === 0 && warnings.length === 0 && (
          <MessageBar intent="success">
            <MessageBarBody>No issues found. All required fields are mapped correctly.</MessageBarBody>
          </MessageBar>
        )}
        {errors.map((d, i) => (
          <div key={i} className={styles.diagItem}>
            <MessageBar intent="error" style={{ width: "100%" }}>
              <MessageBarBody>
                <strong>{d.category}:</strong> {d.message}
              </MessageBarBody>
            </MessageBar>
          </div>
        ))}
        {warnings.map((d, i) => (
          <div key={i} className={styles.diagItem}>
            <MessageBar intent="warning" style={{ width: "100%" }}>
              <MessageBarBody>
                <strong>{d.category}:</strong> {d.message}
              </MessageBarBody>
            </MessageBar>
          </div>
        ))}

        <div className={styles.actions}>
          {!legacyStudy && (
            <Button
              appearance="secondary"
              onClick={() => patch({ stage: "field-mapping" })}
            >
              ← Back to Mappings
            </Button>
          )}
          <Button
            appearance="primary"
            disabled={!preview.canCommit}
            onClick={handleProceedToConfirmation}
          >
            Review Import Preview →
          </Button>
        </div>
      </>
    );
  };

  const renderImportConfirmation = () => {
    const { preview } = state;
    if (!preview) return null;

    if (legacyStudy) {
      return (
        <>
          <Body1 className={styles.desc}>
            This is a <strong>dry-run preview</strong> showing the changes that will be applied to upgrade your project format.
          </Body1>
          <MessageBar intent="info">
            <MessageBarBody>
              {preview.diagnostics.length} normalization step(s) will be applied.
            </MessageBarBody>
          </MessageBar>
          <div className={styles.actions}>
            <Button
              appearance="secondary"
              disabled={state.isProcessing}
              onClick={() => patch({ stage: "validation-preview" })}
            >
              ← Back
            </Button>
            <Button appearance="primary" onClick={handleCommit} disabled={state.isProcessing}>
              Confirm Upgrade ✓
            </Button>
          </div>
        </>
      );
    }

    const allRows =
      preview.projectedRows.formItemRows.length > 0
        ? preview.projectedRows.formItemRows
        : preview.projectedRows.formsRows.length > 0
        ? preview.projectedRows.formsRows
        : preview.projectedRows.codelistRows;

    const headerRow = allRows[0] ?? [];
    const dataRows = allRows.slice(1);

    return (
      <>
        <Body1 className={styles.desc}>
          This is a <strong>dry-run preview</strong> showing what will be written to the workbook.
          Review carefully before confirming.
        </Body1>

        <MessageBar intent="info">
          <MessageBarBody>
            {dataRows.length} row(s) will be appended to{" "}
            <strong>
              {state.confirmedStructure === "form_item"
                ? state.targetFormSheet ?? state.selectedSheet ?? "the target form sheet"
                : state.confirmedStructure === "forms_registry"
                ? "_Forms"
                : "_Codelists"}
            </strong>
            .
          </MessageBarBody>
        </MessageBar>

        <div className={styles.previewTable}>
          <table className={styles.table}>
            <thead>
              <tr>
                {headerRow.map((h, i) => (
                  <th key={i} className={styles.th}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dataRows.slice(0, 10).map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => (
                    <td key={ci} className={styles.td} title={cell}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {dataRows.length > 10 && (
          <Body1 className={styles.desc}>…and {dataRows.length - 10} more row(s).</Body1>
        )}

        {state.syncProgress && (
          <div style={{ marginTop: "16px" }}>
            <Text>
              Syncing: {state.syncProgress.processed} / {state.syncProgress.total} rows
            </Text>
            <ProgressBar value={state.syncProgress.processed} max={state.syncProgress.total} />
          </div>
        )}

        <div className={styles.actions}>
          <Button
            appearance="secondary"
            disabled={state.isProcessing}
            onClick={() => patch({ stage: "validation-preview" })}
          >
            ← Back
          </Button>
          {!state.isProcessing ? (
            <Button
              appearance="primary"
              onClick={handleCommit}
            >
              Confirm Import ✓
            </Button>
          ) : (
            <Button
              appearance="primary"
              onClick={() => {
                cancelRequestedRef.current = true;
                setState((current) => {
                  if (current.syncProgress) {
                    return {
                      ...current,
                      syncProgress: { ...current.syncProgress, cancelRequested: true }
                    };
                  }
                  return current;
                });
              }}
            >
              {state.syncProgress?.cancelRequested ? "Canceling..." : "Cancel Sync"}
            </Button>
          )}
        </div>
      </>
    );
  };

  const renderPostImportSummary = () => {
    const { importResult } = state;
    if (!importResult) return null;
    return (
      <>
        <MessageBar intent={importResult.success ? "success" : "error"}>
          <MessageBarBody>{importResult.message}</MessageBarBody>
        </MessageBar>

        <div className={styles.summaryGrid}>
          <div className={styles.summaryItem}>
            <span className={styles.summaryValue}>{importResult.rowsWritten}</span>
            <span className={styles.summaryLabel}>Rows imported</span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryValue}>{importResult.warnings}</span>
            <span className={styles.summaryLabel}>Warnings</span>
          </div>
          <div className={styles.summaryItem} style={{ gridColumn: "1 / -1" }}>
            <span
              className={styles.summaryLabel}
              style={{ color: tokens.colorNeutralForeground1 }}
            >
              Target sheet
            </span>
            <span style={{ fontSize: tokens.fontSizeBase300, fontWeight: tokens.fontWeightSemibold }}>
              {importResult.targetSheet}
            </span>
          </div>
        </div>

        <Body1 className={styles.desc}>
          The import is complete. Review the target sheet to verify results. You can run a full
          workbook analysis from the registry to validate the ingested data.
        </Body1>

        <div className={styles.actions}>
          {!legacyStudy && (
            <Button
              appearance="secondary"
              onClick={() =>
                patch({ ...INITIAL_STATE, availableSheets: state.availableSheets })
              }
            >
              Start New Ingestion
            </Button>
          )}
          <Button appearance="primary" onClick={onClose}>
            Close Wizard
          </Button>
        </div>
      </>
    );
  };

  // -------------------------------------------------------------------------
  // Stage content dispatch
  // -------------------------------------------------------------------------
  const renderStageContent = () => {
    switch (state.stage) {
      case "source-selection":
        return renderSourceSelection();
      case "workbook-scan":
        return renderWorkbookScan();
      case "structure-detection":
        return renderStructureDetection();
      case "field-mapping":
        return renderFieldMapping();
      case "validation-preview":
        return renderValidationPreview();
      case "import-confirmation":
        return renderImportConfirmation();
      case "post-import-summary":
        return renderPostImportSummary();
      default:
        return null;
    }
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div className={styles.root}>
      <Card className={styles.card}>
        <div className={styles.header}>
          <span className={styles.stageTitle}>
            📥 Ingestion Wizard
          </span>
          <Badge
            appearance="tint"
            color="informative"
            className={styles.stageBadge}
          >
            {STAGE_LABELS[state.stage]}
          </Badge>
        </div>

        {renderStepIndicator()}

        {state.error && (
          <MessageBar intent="error">
            <MessageBarBody>{state.error}</MessageBarBody>
          </MessageBar>
        )}

        {renderStageContent()}
      </Card>
    </div>
  );
};
