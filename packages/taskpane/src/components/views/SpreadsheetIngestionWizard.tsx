/**
 * @issue #28
 */
import * as React from "react";
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
  SelectTabData,
  SelectTabEvent,
  Spinner,
  Tab,
  TabList,
  Text,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import { buildIngestionPreview, buildSheetScanResult, detectColumnMappings, mapRow, FieldMapping, IngestionPreview, SheetScanResult, TARGET_FIELDS, TargetSheet } from "@crf-xl/taskpane/services/spreadsheet-ingestion-service";

import { announcer } from "@crf-xl/core/services/announcer";

import { useUnifiedList } from "../../hooks/useUnifiedList";
import { UniversalWizard, WizardStepDef } from "../ui/UniversalStepper";

interface WizardState {
  availableSheets: string[];
  selectedSheet: string | null;
  scanResult: SheetScanResult | null;
  confirmedStructure: TargetSheet | null;
  mappings: FieldMapping[];
  preview: IngestionPreview | null;
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
  error: string | null;
}

const INITIAL_STATE: WizardState = {
  availableSheets: [],
  selectedSheet: null,
  scanResult: null,
  confirmedStructure: null,
  mappings: [],
  preview: null,
  targetFormSheet: null,
  importResult: null,
  syncProgress: null,
  error: null,
};

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    height: "100%",
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
    flex: 1,
    overflow: "hidden",
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

function confidenceBadgeColor(c: FieldMapping["confidence"]): "success" | "warning" | "danger" {
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

const SYSTEM_SHEETS = new Set([
  "_Study",
  "_Forms",
  "_Schedule",
  "_Codelists",
  "_Methods",
  "_VLM",
  "_Rules",
]);

export interface SpreadsheetIngestionWizardProps {
  onClose: () => void;
}

export const SpreadsheetIngestionWizard: React.FC<SpreadsheetIngestionWizardProps> = ({
  onClose,
}) => {
  const styles = useStyles();
  const [state, setState] = React.useState<WizardState>(INITIAL_STATE);
  const [initialLoading, setInitialLoading] = React.useState(true);
  const abortControllerRef = React.useRef<AbortController | null>(null);
  
  // We need to keep a reset key to restart the wizard
  const [wizardKey, setWizardKey] = React.useState(0);

  const previewData = React.useMemo(() => {
    if (!state.preview) return [];
    const rows = state.preview.projectedRows.formItemRows.length > 0
      ? state.preview.projectedRows.formItemRows
      : state.preview.projectedRows.formsRows.length > 0
        ? state.preview.projectedRows.formsRows
        : state.preview.projectedRows.codelistRows;
    return rows.length > 1 ? rows.slice(1) : []; // skip header
  }, [state.preview]);

  const { items: previewItems, overflowCount } = useUnifiedList({
    data: previewData,
    mode: "capped",
    previewLimit: 10,
  });

  const patch = (partial: Partial<WizardState>) =>
    setState((current) => ({ ...current, ...partial }));

  React.useEffect(() => {
    const loadSheets = async () => {
      patch({ error: null });
      try {
        const sheets = await Excel.run(async (ctx) => {
          const ws = ctx.workbook.worksheets;
          ws.load("items/name");
          await ctx.sync();
          return ws.items.map((s) => s.name);
        });
        const nonSystem = sheets.filter((name) => !SYSTEM_SHEETS.has(name));
        patch({ availableSheets: nonSystem });
      } catch {
        patch({ error: "Could not read workbook sheets. Ensure a workbook is open." });
      } finally {
        setInitialLoading(false);
      }
    };
    void loadSheets();
  }, [wizardKey]);

  const handleScan = async () => {
    if (!state.selectedSheet) throw new Error("No sheet selected");
    patch({ error: null });
    
    let rawRows: string[][] = [];
    let totalRows = 0;
    await Excel.run(async (ctx) => {
      const sheet = ctx.workbook.worksheets.getItem(state.selectedSheet!);
      const used = sheet.getUsedRange();
      used.load(["rowCount", "columnCount"]);
      await ctx.sync();
      totalRows = used.rowCount > 0 ? used.rowCount - 1 : 0;
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
    patch({ scanResult, confirmedStructure });
  };

  const handleConfirmStructure = async () => {
    if (!state.scanResult || !state.confirmedStructure) throw new Error("Missing structure data");
    const mappings = detectColumnMappings(state.scanResult.columnCandidates, state.confirmedStructure);
    patch({ mappings });
  };

  const handleBuildPreview = async () => {
    if (!state.scanResult || !state.confirmedStructure) throw new Error("Missing mappings data");
    const preview = buildIngestionPreview(state.scanResult, state.mappings);
    patch({ preview });
  };

  const handleCommit = async () => {
    if (!state.preview || !state.confirmedStructure || !state.scanResult) return;
    abortControllerRef.current = new AbortController();
    patch({
      error: null,
      syncProgress: { processed: 0, total: state.scanResult.rowCount, cancelRequested: false },
    });

    try {
      const { mappings } = state.preview;
      const totalRows = state.scanResult.rowCount;
      const pageSize = 500;
      let rowsWritten = 0;
      let targetSheetName = "";

      const maxColIndex = Math.max(0, ...state.scanResult.columnCandidates.map((c) => c.columnIndex));
      const colCount = maxColIndex + 1;

      for (let i = 0; i < totalRows; i += pageSize) {
        await new Promise((resolve) => setTimeout(resolve, 10));
        if (abortControllerRef.current?.signal.aborted) break;

        const currentChunkSize = Math.min(pageSize, totalRows - i);

        await Excel.run(async (ctx) => {
          const sheets = ctx.workbook.worksheets;
          const sourceSheet = sheets.getItem(state.selectedSheet!);
          const sourceRange = sourceSheet.getRangeByIndexes(i + 1, 0, currentChunkSize, colCount);
          sourceRange.load("values");
          await ctx.sync();

          const sourceRows = sourceRange.values as string[][];
          const mappedRows = sourceRows.map((r) => mapRow(r, mappings, state.confirmedStructure!));

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
              const headers = [
                "Variable Name", "Label", "Variable Type", "Required", "Length",
                "Significant Digits", "Minimum", "Maximum", "Show If", "Codelist ID",
                "Origin", "Method OID", "SDTM Domain", "SDTM Variable", "Comment",
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
        const percent = Math.round((rowsWritten / totalRows) * 100);
        announcer.announce(`Importing data: ${percent}%`);
        
        setState((current) => {
          if (current.syncProgress) {
            return { ...current, syncProgress: { ...current.syncProgress, processed: rowsWritten } };
          }
          return current;
        });
      }

      if (abortControllerRef.current?.signal.aborted) {
        announcer.announce("Import Cancelled", "polite");
        patch({
          syncProgress: null,
          importResult: {
            success: false,
            rowsWritten,
            targetSheet: targetSheetName,
            message: `Partial import: ${rowsWritten} row(s) imported before cancellation.`,
            warnings: (state.preview.diagnostics || []).filter((d) => d.severity === "warning").length,
          },
        });
        return;
      }

      const warnings = (state.preview.diagnostics || []).filter((d) => d.severity === "warning").length;
      announcer.announce("Import Complete", "polite");
      patch({
        importResult: {
          success: true,
          rowsWritten,
          targetSheet: targetSheetName,
          message: `Successfully imported ${rowsWritten} row(s) into ${targetSheetName}.`,
          warnings,
        },
        syncProgress: null,
      });
    } catch (e) {
      throw new Error(`Import failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const steps: WizardStepDef[] = [
    {
      id: "source",
      label: "Source",
      canNext: !!state.selectedSheet,
      nextLabel: "Scan Sheet →",
      onNext: handleScan,
      content: (
        <>
          <Body1 className={styles.desc}>
            Select a sheet from the current workbook to ingest. System sheets (prefixed with _) are excluded.
          </Body1>
          {initialLoading && <Spinner size="tiny" label="Loading sheets…" />}
          {!initialLoading && state.availableSheets.length === 0 && (
            <MessageBar intent="warning">
              <MessageBarBody>No non-system sheets found. Open a legacy CRF file or add data sheets to this workbook.</MessageBarBody>
            </MessageBar>
          )}
          <TabList
            aria-label="Worksheet selection"
            vertical
            className={styles.sheetList}
            selectedValue={state.selectedSheet || undefined}
            onTabSelect={(_e: SelectTabEvent, data: SelectTabData) => {
              patch({ selectedSheet: data.value as string });
            }}
          >
            {state.availableSheets.map((name) => (
              <Tab key={name} value={name}>
                📄 {name}
              </Tab>
            ))}
          </TabList>
        </>
      ),
    },
    {
      id: "structure",
      label: "Structure",
      canNext: !!state.confirmedStructure,
      nextLabel: "Confirm & Map Fields →",
      onNext: handleConfirmStructure,
      content: state.scanResult && (
        <>
          <Body1 className={styles.desc}>
            Scanned <strong>{state.scanResult.sheetName}</strong>: found <strong>{state.scanResult.columnCandidates.length}</strong> column(s) and <strong>{state.scanResult.rowCount}</strong> data row(s).
          </Body1>
          <Text style={{ fontSize: tokens.fontSizeBase200, fontWeight: tokens.fontWeightSemibold }}>
            Detected columns: {state.scanResult.columnCandidates.map((c) => c.columnName).join(", ") || "none"}
          </Text>
          <Body1 className={styles.desc}>
            CRF.xl detected that this sheet most likely contains <strong>{STRUCTURE_LABELS[detectedStructureToTargetSheet(state.scanResult.detectedStructure)]}</strong>. Confirm or select the correct structure type:
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
        </>
      ),
    },
    {
      id: "mapping",
      label: "Map Fields",
      nextLabel: "Validate Mappings →",
      onNext: handleBuildPreview,
      content: state.scanResult && (
        <>
          <Body1 className={styles.desc}>
            Map source columns to CRF.xl target fields. Auto-detected suggestions are shown. Override any mapping using the dropdowns.
          </Body1>
          <div className={styles.mappingList}>
            {state.mappings.map((mapping) => {
              const descriptor = TARGET_FIELDS.find((f) => f.field === mapping.targetField)!;
              const currentValue = mapping.sourceColumn !== null ? String(mapping.sourceColumn.columnIndex) : "-1";
              const cols = [{ label: "(not mapped)", value: "-1" }, ...state.scanResult!.columnCandidates.map(c => ({ label: `${c.columnName} (col ${c.columnIndex + 1})`, value: String(c.columnIndex) }))];
              return (
                <div key={mapping.targetField} className={styles.mappingRow}>
                  <span className={styles.mappingLabel}>
                    {descriptor.label}
                    {descriptor.required && <span style={{ color: tokens.colorPaletteRedForeground1 }}>*</span>}
                    <Badge size="small" color={confidenceBadgeColor(mapping.confidence)} appearance="tint">
                      {confidenceLabel(mapping.confidence)}
                    </Badge>
                  </span>
                  <span className={styles.mappingArrow}>←</span>
                  <Field>
                    <Dropdown
                      aria-label={`Map source column for ${descriptor.label}`}
                      value={cols.find((c) => c.value === currentValue)?.label ?? "(not mapped)"}
                      onOptionSelect={(_ev, data) => {
                        const idx = data.optionValue ? parseInt(data.optionValue, 10) : -1;
                        setState((current) => {
                          const col = idx !== -1 ? (current.scanResult?.columnCandidates.find((c) => c.columnIndex === idx) ?? null) : null;
                          return {
                            ...current,
                            mappings: current.mappings.map((m) =>
                              m.targetField === mapping.targetField ? { ...m, sourceColumn: col, confidence: col ? "high" : "unresolved", isUserOverridden: true } : m
                            ),
                          };
                        });
                      }}
                    >
                      {cols.map((c) => (
                        <Option key={c.value} value={c.value}>{c.label}</Option>
                      ))}
                    </Dropdown>
                  </Field>
                </div>
              );
            })}
          </div>
          {state.confirmedStructure === "form_item" && (
            <Field label="Target form sheet name (will be created if absent)">
              <Dropdown
                aria-label="Target form sheet name"
                value={state.targetFormSheet ?? state.selectedSheet ?? ""}
                onOptionSelect={(_ev, data) => patch({ targetFormSheet: data.optionValue ?? null })}
              >
                {[state.selectedSheet ?? "", ...state.availableSheets.filter((s) => s !== state.selectedSheet)].filter(Boolean).map((s) => (
                  <Option key={s} value={s}>{s}</Option>
                ))}
              </Dropdown>
            </Field>
          )}
        </>
      ),
    },
    {
      id: "preview",
      label: "Preview",
      canNext: !!state.preview?.canCommit,
      nextLabel: "Review Import Preview →",
      content: state.preview && (
        <>
          {state.preview.diagnostics.length === 0 && (
            <MessageBar intent="success">
              <MessageBarBody>No issues found. All required fields are mapped correctly.</MessageBarBody>
            </MessageBar>
          )}
          {state.preview.diagnostics.map((d, i) => (
            <div key={i} className={styles.diagItem}>
              <MessageBar intent={d.severity === "error" ? "error" : "warning"} style={{ width: "100%" }}>
                <MessageBarBody><strong>{d.category}:</strong> {d.message}</MessageBarBody>
              </MessageBar>
            </div>
          ))}
        </>
      ),
    },
    {
      id: "confirm",
      label: "Confirm",
      nextLabel: "Confirm Import ✓",
      onNext: handleCommit,
      content: state.preview && (
        <>
          <Body1 className={styles.desc}>This is a <strong>dry-run preview</strong> showing what will be written to the workbook.</Body1>
          <div className={styles.previewTable}>
            <table className={styles.table}>
              <thead>
                <tr>
                  {(state.preview.projectedRows.formItemRows[0] || state.preview.projectedRows.formsRows[0] || state.preview.projectedRows.codelistRows[0] || []).map((h, i) => (
                    <th key={i} className={styles.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewItems.map((row, ri) => (
                  <tr key={ri}>
                    {row.map((cell, ci) => (
                      <td key={ci} className={styles.td} title={cell}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {overflowCount > 0 && (
            <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
              + {overflowCount} more row(s) hidden in preview
            </Text>
          )}
          {state.syncProgress && (
            <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
              <Text>Syncing: {state.syncProgress.processed} / {state.syncProgress.total} rows</Text>
              <ProgressBar value={state.syncProgress.processed} max={state.syncProgress.total} />
              <Button onClick={() => {
                abortControllerRef.current?.abort();
                patch({ syncProgress: { ...state.syncProgress!, cancelRequested: true } });
              }}>
                Cancel Sync
              </Button>
            </div>
          )}
        </>
      ),
    },
    {
      id: "summary",
      label: "Summary",
      hideCancel: true,
      hideNext: true,
      backLabel: "Start New Ingestion",
      onBack: () => {
        setState({ ...INITIAL_STATE, availableSheets: state.availableSheets });
        setWizardKey(prev => prev + 1);
      },
      content: state.importResult && (
        <>
          <MessageBar intent={state.importResult.success ? "success" : "error"}>
            <MessageBarBody>{state.importResult.message}</MessageBarBody>
          </MessageBar>
          <div className={styles.summaryGrid}>
            <div className={styles.summaryItem}>
              <span className={styles.summaryValue}>{state.importResult.rowsWritten}</span>
              <span className={styles.summaryLabel}>Rows imported</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryValue}>{state.importResult.warnings}</span>
              <span className={styles.summaryLabel}>Warnings</span>
            </div>
          </div>
          <Button appearance="primary" onClick={onClose} style={{ marginTop: "16px" }}>Close Wizard</Button>
        </>
      ),
    }
  ];

  return (
    <div className={styles.root}>
      <Card className={styles.card}>
        <div className={styles.header}>
          <span className={styles.stageTitle}>📥 Ingestion Wizard</span>
        </div>
        {state.error && (
          <MessageBar intent="error">
            <MessageBarBody>{state.error}</MessageBarBody>
          </MessageBar>
        )}
        <UniversalWizard
          key={wizardKey}
          steps={steps}
          onCancel={onClose}
        />
      </Card>
    </div>
  );
};
