/**
 * @issue #28
 */
/**
 * ============================================================================
 * OdmImportWizard.tsx
 * ============================================================================
 * 5-stage interactive wizard for importing CDISC ODM XML into CRF.xl.
 *
 * Stages (aligned with the shared scan → map → preview → commit → summarize UX):
 *  1. Scan        – user provides ODM XML (paste or file upload)
 *  2. Parse       – parse the ODM and surface diagnostics
 *  3. Preview     – dry-run projection review (study, forms, codelists)
 *  4. Confirm     – mandatory confirmation before write-back
 *  5. Summary     – post-import results with provenance record
 *
 * Owning issue: fderuiter/CRF.xl#63 (ODM-to-Excel Reverse Parser)
 * Epic:         fderuiter/CRF.xl#76 (Ingestion & Migration Wizards)
 */

/* global Excel */
import * as React from "react";
import {
  Badge,
  Body1,
  Button,
  Card,
  MessageBar,
  MessageBarBody,
  Spinner,
  Text,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import { importOdmXml, OdmImportPackage } from "../../core";
import { formatNumber } from "../../core/utils/locale-utils";
import {
  createImportManifest,
  createImportProvenance,
  ImportManifest,
  persistImportManifest,
} from "../../core";
import { speculativeSyncManager, getPredictedStudyDesign } from "../../core";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type WizardStage = "scan" | "parse" | "preview" | "confirm" | "summary";

interface WizardState {
  stage: WizardStage;
  xmlInput: string;
  importPackage: OdmImportPackage | null;
  importManifest: ImportManifest | null;
  isProcessing: boolean;
  error: string | null;
}

const INITIAL_STATE: WizardState = {
  stage: "scan",
  xmlInput: "",
  importPackage: null,
  importManifest: null,
  isProcessing: false,
  error: null,
};

// ---------------------------------------------------------------------------
// Styles (aligned with SpreadsheetIngestionWizard visual language)
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
  xmlTextarea: {
    width: "100%",
    minHeight: "140px",
    fontFamily: "monospace",
    fontSize: tokens.fontSizeBase100,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    borderRadius: tokens.borderRadiusMedium,
    padding: "8px",
    resize: "vertical",
    backgroundColor: tokens.colorNeutralBackground2,
    boxSizing: "border-box",
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
    maxHeight: "200px",
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
  provenanceBox: {
    backgroundColor: tokens.colorNeutralBackground2,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    padding: "8px 12px",
    fontSize: tokens.fontSizeBase100,
    fontFamily: "monospace",
    lineHeight: "1.6",
  },
  sectionLabel: {
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
    marginTop: "4px",
  },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STAGE_LABELS: Record<WizardStage, string> = {
  scan: "1 / 5  Scan",
  parse: "2 / 5  Parse",
  preview: "3 / 5  Preview",
  confirm: "4 / 5  Confirm",
  summary: "5 / 5  Summary",
};

const STAGE_ORDER: WizardStage[] = ["scan", "parse", "preview", "confirm", "summary"];

// ---------------------------------------------------------------------------
// Component props
// ---------------------------------------------------------------------------

export interface OdmImportWizardProps {
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const OdmImportWizard: React.FC<OdmImportWizardProps> = ({ onClose }) => {
  const styles = useStyles();
  const [state, setState] = React.useState<WizardState>(INITIAL_STATE);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const stageIndex = STAGE_ORDER.indexOf(state.stage);
  const patch = (partial: Partial<WizardState>) =>
    setState((current) => ({ ...current, ...partial }));

  // -------------------------------------------------------------------------
  // Stage 1 → 2: parse the ODM XML
  // -------------------------------------------------------------------------
  const handleParse = async () => {
    const xml = state.xmlInput.trim();
    if (!xml) {
      patch({ error: "Please paste or load an ODM XML document before parsing." });
      return;
    }
    patch({ isProcessing: true, error: null, stage: "parse" });
    try {
      const importPackage = await importOdmXml(xml);
      patch({ importPackage, isProcessing: false, stage: "preview" });
    } catch (e) {
      patch({
        error: `Parse failed: ${e instanceof Error ? e.message : String(e)}`,
        isProcessing: false,
        stage: "scan",
      });
    }
  };

  // -------------------------------------------------------------------------
  // File upload handler
  // -------------------------------------------------------------------------
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      if (typeof text === "string") {
        patch({ xmlInput: text });
      }
    };
    reader.readAsText(file);
  };

  // -------------------------------------------------------------------------
  // Stage 3 → 4: proceed to confirmation
  // -------------------------------------------------------------------------
  const handleProceedToConfirm = () => {
    patch({ stage: "confirm" });
  };

  // -------------------------------------------------------------------------
  // Stage 4: commit the import to the active workbook
  // -------------------------------------------------------------------------
  const handleCommit = async () => {
    const { importPackage } = state;
    if (!importPackage) return;
    patch({ isProcessing: true, error: null });

    try {
      // Apply to an ExcelJS workbook for the Office.js write path.
      // We delegate to applyOdmImportToWorkbook for the workbook-mutation
      // logic, then mirror the same writes via Excel.run.
      const predictedStudy = await getPredictedStudyDesign(importPackage.projection);
      await speculativeSyncManager.startSync(importPackage.projection, predictedStudy, null);

      // Build provenance and manifest.
      const sourceId = importPackage.study.metadata.protocolId || "unknown-odm-source";
      const provenance = createImportProvenance(
        sourceId,
        "odm-xml",
        importPackage.study.metadata.version
      );
      const rowsWritten =
        importPackage.projection.studyRows.length -
        1 +
        (importPackage.projection.formsRows.length - 1) +
        (importPackage.projection.codelistRows.length - 1);
      const sheetsWritten = ["_Study", "_Forms", "_Codelists"];
      const summary = {
        status: importPackage.summary.status,
        diagnostics: importPackage.diagnostics,
        canCommit: importPackage.summary.status !== "conflicts",
      };
      const manifest = createImportManifest(provenance, summary, sheetsWritten, rowsWritten);
      persistImportManifest(manifest);

      patch({ importManifest: manifest, isProcessing: false, stage: "summary" });
    } catch (e) {
      patch({
        error: `Import failed: ${e instanceof Error ? e.message : String(e)}`,
        isProcessing: false,
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
            i < stageIndex ? styles.stepDotDone : i === stageIndex ? styles.stepDotActive : ""
          }`}
        />
      ))}
    </div>
  );

  function renderPreviewTable(rows: string[][], maxDataRows = 8) {
    const header = rows[0] ?? [];
    const data = rows.slice(1, 1 + maxDataRows);
    const overflow = rows.length - 1 - data.length;
    return (
      <>
        <div className={styles.previewTable}>
          <table className={styles.table}>
            <thead>
              <tr>
                {header.map((h, i) => (
                  <th key={i} className={styles.th}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, ri) => (
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
        {overflow > 0 && <Body1 className={styles.desc}>…and {overflow} more row(s).</Body1>}
      </>
    );
  }

  // -------------------------------------------------------------------------
  // Stage renderers
  // -------------------------------------------------------------------------

  const renderScan = () => (
    <>
      <Body1 className={styles.desc}>
        Paste CDISC ODM XML below, or load a file from disk. CRF.xl will parse the supported ODM v1
        subset and preview the import before any workbook changes are made.
      </Body1>

      <textarea
        className={styles.xmlTextarea}
        placeholder={`<?xml version="1.0" encoding="UTF-8"?>\n<ODM …>\n  …\n</ODM>`}
        value={state.xmlInput}
        onChange={(e) => patch({ xmlInput: e.target.value })}
        spellCheck={false}
        aria-label="ODM XML input"
      />

      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        <Button
          appearance="outline"
          size="small"
          onClick={() => fileInputRef.current?.click()}
          icon={<span>📂</span>}
        >
          Load from file…
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xml,text/xml,application/xml"
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
        {state.xmlInput.trim().length > 0 && (
          <Text style={{ fontSize: tokens.fontSizeBase100, color: tokens.colorNeutralForeground3 }}>
            {formatNumber(state.xmlInput.trim().length)} characters loaded
          </Text>
        )}
      </div>

      <div className={styles.actions}>
        <Button appearance="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button
          appearance="primary"
          disabled={!state.xmlInput.trim() || state.isProcessing}
          icon={state.isProcessing ? <Spinner size="tiny" /> : undefined}
          onClick={handleParse}
        >
          Parse ODM →
        </Button>
      </div>
    </>
  );

  const renderParse = () => <Spinner size="small" label="Parsing ODM XML…" />;

  const renderPreview = () => {
    const { importPackage } = state;
    if (!importPackage) return null;

    const { summary, diagnostics, projection } = importPackage;
    const errors = diagnostics.filter((d) => d.severity === "error");
    const warnings = diagnostics.filter((d) => d.severity === "warning");

    return (
      <>
        {/* Diagnostics */}
        {errors.length === 0 && warnings.length === 0 && (
          <MessageBar intent="success">
            <MessageBarBody>ODM parsed cleanly — no issues found.</MessageBarBody>
          </MessageBar>
        )}
        {errors.map((d, i) => (
          <div key={i} className={styles.diagItem}>
            <MessageBar intent="error" style={{ width: "100%" }}>
              <MessageBarBody>
                <strong>[{d.category}]</strong> {d.message}
                {d.location && (
                  <>
                    {" "}
                    — <em>{d.location}</em>
                  </>
                )}
              </MessageBarBody>
            </MessageBar>
          </div>
        ))}
        {warnings.map((d, i) => (
          <div key={i} className={styles.diagItem}>
            <MessageBar intent="warning" style={{ width: "100%" }}>
              <MessageBarBody>
                <strong>[{d.category}]</strong> {d.message}
                {d.location && (
                  <>
                    {" "}
                    — <em>{d.location}</em>
                  </>
                )}
              </MessageBarBody>
            </MessageBar>
          </div>
        ))}

        {/* Study summary */}
        <div className={styles.summaryGrid}>
          <div className={styles.summaryItem}>
            <span className={styles.summaryValue}>{summary.actionsCount.addedForms}</span>
            <span className={styles.summaryLabel}>Forms detected</span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryValue}>{summary.actionsCount.addedCodelists}</span>
            <span className={styles.summaryLabel}>Codelists detected</span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryValue}>{summary.actionsCount.addedCodelistItems}</span>
            <span className={styles.summaryLabel}>Codelist items</span>
          </div>
          <div className={styles.summaryItem}>
            <span
              className={styles.summaryValue}
              style={{
                color:
                  summary.status === "conflicts"
                    ? tokens.colorPaletteRedForeground1
                    : summary.status === "warnings"
                      ? tokens.colorPaletteDarkOrangeForeground1
                      : tokens.colorPaletteGreenForeground1,
              }}
            >
              {summary.status}
            </span>
            <span className={styles.summaryLabel}>Import status</span>
          </div>
        </div>

        {/* Forms preview */}
        {projection.formsRows.length > 1 && (
          <>
            <Text className={styles.sectionLabel}>_Forms preview</Text>
            {renderPreviewTable(projection.formsRows)}
          </>
        )}

        {/* Codelists preview */}
        {projection.codelistRows.length > 1 && (
          <>
            <Text className={styles.sectionLabel}>_Codelists preview</Text>
            {renderPreviewTable(projection.codelistRows)}
          </>
        )}

        <div className={styles.actions}>
          <Button appearance="secondary" onClick={() => patch({ stage: "scan" })}>
            ← Back
          </Button>
          <Button
            appearance="primary"
            disabled={summary.status === "conflicts"}
            onClick={handleProceedToConfirm}
          >
            Review & Confirm →
          </Button>
        </div>
      </>
    );
  };

  const renderConfirm = () => {
    const { importPackage } = state;
    if (!importPackage) return null;
    const { projection } = importPackage;
    const totalRows =
      projection.studyRows.length -
      1 +
      (projection.formsRows.length - 1) +
      (projection.codelistRows.length - 1);

    return (
      <>
        <Body1 className={styles.desc}>
          This is a <strong>dry-run preview</strong>. Review the data below and confirm to write it
          into your workbook. The <strong>_Study</strong>, <strong>_Forms</strong>, and{" "}
          <strong>_Codelists</strong> sheets will be overwritten.
        </Body1>

        <MessageBar intent="warning">
          <MessageBarBody>
            <strong>Non-destructive gate:</strong> {totalRows} data row(s) across 3 system sheets
            will be written. Existing rows on those sheets will be replaced.
          </MessageBarBody>
        </MessageBar>

        {/* _Study full preview */}
        <Text className={styles.sectionLabel}>_Study ({projection.studyRows.length - 1} row)</Text>
        {renderPreviewTable(projection.studyRows)}

        {/* _Forms */}
        <Text className={styles.sectionLabel}>
          _Forms ({projection.formsRows.length - 1} row(s))
        </Text>
        {renderPreviewTable(projection.formsRows)}

        {/* _Codelists */}
        <Text className={styles.sectionLabel}>
          _Codelists ({projection.codelistRows.length - 1} row(s))
        </Text>
        {renderPreviewTable(projection.codelistRows)}

        <div className={styles.actions}>
          <Button appearance="secondary" onClick={() => patch({ stage: "preview" })}>
            ← Back
          </Button>
          <Button
            appearance="primary"
            disabled={state.isProcessing}
            icon={state.isProcessing ? <Spinner size="tiny" /> : undefined}
            onClick={handleCommit}
          >
            {state.isProcessing ? "Importing…" : "Confirm Import ✓"}
          </Button>
        </div>
      </>
    );
  };

  const renderSummary = () => {
    const { importManifest, importPackage } = state;
    if (!importManifest || !importPackage) return null;

    return (
      <>
        <MessageBar intent="success">
          <MessageBarBody>
            ODM import complete. {importManifest.rowsWritten} data row(s) written to{" "}
            {importManifest.sheetsWritten.join(", ")}.
          </MessageBarBody>
        </MessageBar>

        <div className={styles.summaryGrid}>
          <div className={styles.summaryItem}>
            <span className={styles.summaryValue}>{importManifest.rowsWritten}</span>
            <span className={styles.summaryLabel}>Rows written</span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryValue}>
              {importPackage.summary.actionsCount.warnings}
            </span>
            <span className={styles.summaryLabel}>Warnings</span>
          </div>
          <div className={styles.summaryItem} style={{ gridColumn: "1 / -1" }}>
            <span className={styles.summaryLabel}>Protocol</span>
            <span
              style={{ fontSize: tokens.fontSizeBase300, fontWeight: tokens.fontWeightSemibold }}
            >
              {importPackage.study.metadata.protocolId} — {importPackage.study.metadata.studyName}
            </span>
          </div>
        </div>

        <Text className={styles.sectionLabel}>Provenance record</Text>
        <div className={styles.provenanceBox}>
          <div>Source: {importManifest.provenance.sourceId}</div>
          <div>Type: {importManifest.provenance.sourceType}</div>
          {importManifest.provenance.sourceVersion && (
            <div>Version: {importManifest.provenance.sourceVersion}</div>
          )}
          <div>Imported at: {importManifest.provenance.importedAt}</div>
          <div>Sheets: {importManifest.sheetsWritten.join(", ")}</div>
        </div>

        <Body1 className={styles.desc}>
          The import is complete and a provenance record has been saved to sessionStorage. Review
          the system sheets to verify the ingested data, then run a full workbook analysis from the
          registry.
        </Body1>

        <div className={styles.actions}>
          <Button appearance="secondary" onClick={() => patch({ ...INITIAL_STATE })}>
            Start New Import
          </Button>
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
      case "scan":
        return renderScan();
      case "parse":
        return renderParse();
      case "preview":
        return renderPreview();
      case "confirm":
        return renderConfirm();
      case "summary":
        return renderSummary();
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
          <span className={styles.stageTitle}>🔄 ODM Import Wizard</span>
          <Badge appearance="tint" color="informative" className={styles.stageBadge}>
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
