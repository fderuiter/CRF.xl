/**
 * @issue #28
 */
import * as React from "react";
import {

  Body1,
  Button,
  Card,
  MessageBar,
  MessageBarBody,

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
import { UniversalWizard, WizardStepDef } from "../ui/UniversalStepper";

interface WizardState {
  xmlInput: string;
  importPackage: OdmImportPackage | null;
  importManifest: ImportManifest | null;
  error: string | null;
}

const INITIAL_STATE: WizardState = {
  xmlInput: "",
  importPackage: null,
  importManifest: null,
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

export interface OdmImportWizardProps {
  onClose: () => void;
}

export const OdmImportWizard: React.FC<OdmImportWizardProps> = ({ onClose }) => {
  const styles = useStyles();
  const [state, setState] = React.useState<WizardState>(INITIAL_STATE);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [wizardKey, setWizardKey] = React.useState(0);

  const patch = (partial: Partial<WizardState>) =>
    setState((current) => ({ ...current, ...partial }));

  const handleParse = async () => {
    const xml = state.xmlInput.trim();
    if (!xml) {
      patch({ error: "Please paste or load an ODM XML document before parsing." });
      throw new Error("No XML input");
    }
    patch({ error: null });
    try {
      const importPackage = await importOdmXml(xml);
      patch({ importPackage });
    } catch (e) {
      patch({ error: `Parse failed: ${e instanceof Error ? e.message : String(e)}` });
      throw e;
    }
  };

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

  const handleCommit = async () => {
    const { importPackage } = state;
    if (!importPackage) return;
    patch({ error: null });

    try {
      const predictedStudy = await getPredictedStudyDesign(importPackage.projection);
      await speculativeSyncManager.startSync(importPackage.projection, predictedStudy, null);

      const sourceId = importPackage.study.metadata.protocolId || "unknown-odm-source";
      const provenance = createImportProvenance(sourceId, "odm-xml", importPackage.study.metadata.version);
      const rowsWritten = importPackage.projection.studyRows.length - 1 + (importPackage.projection.formsRows.length - 1) + (importPackage.projection.codelistRows.length - 1);
      const sheetsWritten = ["_Study", "_Forms", "_Codelists"];
      const summary = {
        status: importPackage.summary.status,
        diagnostics: importPackage.diagnostics,
        canCommit: importPackage.summary.status !== "conflicts",
      };
      const manifest = createImportManifest(provenance, summary, sheetsWritten, rowsWritten);
      persistImportManifest(manifest);

      patch({ importManifest: manifest });
    } catch (e) {
      patch({ error: `Import failed: ${e instanceof Error ? e.message : String(e)}` });
      throw e;
    }
  };

  function renderPreviewTable(rows: string[][], maxDataRows = 8) {
    const header = rows[0] ?? [];
    const data = rows.slice(1, 1 + maxDataRows);
    const overflow = rows.length - 1 - data.length;
    return (
      <>
        <div className={styles.previewTable}>
          <table className={styles.table}>
            <thead>
              <tr>{header.map((h, i) => <th key={i} className={styles.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {data.map((row, ri) => (
                <tr key={ri}>{row.map((cell, ci) => <td key={ci} className={styles.td} title={cell}>{cell}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
        {overflow > 0 && <Body1 className={styles.desc}>…and {overflow} more row(s).</Body1>}
      </>
    );
  }

  const steps: WizardStepDef[] = [
    {
      id: "scan",
      label: "Scan",
      canNext: !!state.xmlInput.trim(),
      nextLabel: "Parse ODM →",
      onNext: handleParse,
      content: (
        <>
          <Body1 className={styles.desc}>
            Paste CDISC ODM XML below, or load a file from disk. CRF.xl will parse the supported ODM v1 subset and preview the import before any workbook changes are made.
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
            <Button appearance="outline" size="small" onClick={() => fileInputRef.current?.click()} icon={<span>📂</span>}>
              Load from file…
            </Button>
            <input ref={fileInputRef} type="file" accept=".xml,text/xml,application/xml" style={{ display: "none" }} onChange={handleFileChange} />
            {state.xmlInput.trim().length > 0 && (
              <Text style={{ fontSize: tokens.fontSizeBase100, color: tokens.colorNeutralForeground3 }}>
                {formatNumber(state.xmlInput.trim().length)} characters loaded
              </Text>
            )}
          </div>
        </>
      ),
    },
    {
      id: "preview",
      label: "Preview",
      canNext: state.importPackage?.summary.status !== "conflicts",
      nextLabel: "Review & Confirm →",
      content: state.importPackage ? (
        <>
          {state.importPackage.diagnostics.filter(d => d.severity === "error").length === 0 && state.importPackage.diagnostics.filter(d => d.severity === "warning").length === 0 && (
            <MessageBar intent="success"><MessageBarBody>ODM parsed cleanly — no issues found.</MessageBarBody></MessageBar>
          )}
          {state.importPackage.diagnostics.filter(d => d.severity === "error").map((d, i) => (
            <div key={i} className={styles.diagItem}>
              <MessageBar intent="error" style={{ width: "100%" }}><MessageBarBody><strong>[{d.category}]</strong> {d.message}{d.location && <> — <em>{d.location}</em></>}</MessageBarBody></MessageBar>
            </div>
          ))}
          {state.importPackage.diagnostics.filter(d => d.severity === "warning").map((d, i) => (
            <div key={i} className={styles.diagItem}>
              <MessageBar intent="warning" style={{ width: "100%" }}><MessageBarBody><strong>[{d.category}]</strong> {d.message}{d.location && <> — <em>{d.location}</em></>}</MessageBarBody></MessageBar>
            </div>
          ))}
          <div className={styles.summaryGrid}>
            <div className={styles.summaryItem}><span className={styles.summaryValue}>{state.importPackage.summary.actionsCount.addedForms}</span><span className={styles.summaryLabel}>Forms detected</span></div>
            <div className={styles.summaryItem}><span className={styles.summaryValue}>{state.importPackage.summary.actionsCount.addedCodelists}</span><span className={styles.summaryLabel}>Codelists detected</span></div>
            <div className={styles.summaryItem}><span className={styles.summaryValue}>{state.importPackage.summary.actionsCount.addedCodelistItems}</span><span className={styles.summaryLabel}>Codelist items</span></div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryValue} style={{ color: state.importPackage.summary.status === "conflicts" ? tokens.colorPaletteRedForeground1 : state.importPackage.summary.status === "warnings" ? tokens.colorPaletteDarkOrangeForeground1 : tokens.colorPaletteGreenForeground1 }}>
                {state.importPackage.summary.status}
              </span>
              <span className={styles.summaryLabel}>Import status</span>
            </div>
          </div>
          {state.importPackage.projection.formsRows.length > 1 && <><Text className={styles.sectionLabel}>_Forms preview</Text>{renderPreviewTable(state.importPackage.projection.formsRows)}</>}
          {state.importPackage.projection.codelistRows.length > 1 && <><Text className={styles.sectionLabel}>_Codelists preview</Text>{renderPreviewTable(state.importPackage.projection.codelistRows)}</>}
        </>
      ) : null,
    },
    {
      id: "confirm",
      label: "Confirm",
      nextLabel: "Confirm Import ✓",
      onNext: handleCommit,
      content: state.importPackage ? (
        <>
          <Body1 className={styles.desc}>
            This is a <strong>dry-run preview</strong>. Review the data below and confirm to write it into your workbook. The <strong>_Study</strong>, <strong>_Forms</strong>, and <strong>_Codelists</strong> sheets will be overwritten.
          </Body1>
          <MessageBar intent="warning">
            <MessageBarBody>
              <strong>Non-destructive gate:</strong> {state.importPackage.projection.studyRows.length - 1 + (state.importPackage.projection.formsRows.length - 1) + (state.importPackage.projection.codelistRows.length - 1)} data row(s) across 3 system sheets will be written. Existing rows on those sheets will be replaced.
            </MessageBarBody>
          </MessageBar>
          <Text className={styles.sectionLabel}>_Study ({state.importPackage.projection.studyRows.length - 1} row)</Text>
          {renderPreviewTable(state.importPackage.projection.studyRows)}
          <Text className={styles.sectionLabel}>_Forms ({state.importPackage.projection.formsRows.length - 1} row(s))</Text>
          {renderPreviewTable(state.importPackage.projection.formsRows)}
          <Text className={styles.sectionLabel}>_Codelists ({state.importPackage.projection.codelistRows.length - 1} row(s))</Text>
          {renderPreviewTable(state.importPackage.projection.codelistRows)}
        </>
      ) : null,
    },
    {
      id: "summary",
      label: "Summary",
      hideCancel: true,
      hideNext: true,
      backLabel: "Start New Import",
      onBack: () => {
        setState({ ...INITIAL_STATE });
        setWizardKey(prev => prev + 1);
      },
      content: state.importManifest && state.importPackage ? (
        <>
          <MessageBar intent="success">
            <MessageBarBody>ODM import complete. {state.importManifest.rowsWritten} data row(s) written to {state.importManifest.sheetsWritten.join(", ")}.</MessageBarBody>
          </MessageBar>
          <div className={styles.summaryGrid}>
            <div className={styles.summaryItem}><span className={styles.summaryValue}>{state.importManifest.rowsWritten}</span><span className={styles.summaryLabel}>Rows written</span></div>
            <div className={styles.summaryItem}><span className={styles.summaryValue}>{state.importPackage.summary.actionsCount.warnings}</span><span className={styles.summaryLabel}>Warnings</span></div>
            <div className={styles.summaryItem} style={{ gridColumn: "1 / -1" }}>
              <span className={styles.summaryLabel}>Protocol</span>
              <span style={{ fontSize: tokens.fontSizeBase300, fontWeight: tokens.fontWeightSemibold }}>
                {state.importPackage.study.metadata.protocolId} — {state.importPackage.study.metadata.studyName}
              </span>
            </div>
          </div>
          <Text className={styles.sectionLabel}>Provenance record</Text>
          <div className={styles.provenanceBox}>
            <div>Source: {state.importManifest.provenance.sourceId}</div>
            <div>Type: {state.importManifest.provenance.sourceType}</div>
            {state.importManifest.provenance.sourceVersion && <div>Version: {state.importManifest.provenance.sourceVersion}</div>}
            <div>Imported at: {state.importManifest.provenance.importedAt}</div>
            <div>Sheets: {state.importManifest.sheetsWritten.join(", ")}</div>
          </div>
          <Button appearance="primary" onClick={onClose} style={{ marginTop: "16px" }}>Close Wizard</Button>
        </>
      ) : null,
    }
  ];

  return (
    <div className={styles.root}>
      <Card className={styles.card}>
        <div className={styles.header}>
          <span className={styles.stageTitle}>🔄 ODM Import Wizard</span>
        </div>
        {state.error && <MessageBar intent="error"><MessageBarBody>{state.error}</MessageBarBody></MessageBar>}
        <UniversalWizard key={wizardKey} steps={steps} onCancel={onClose} />
      </Card>
    </div>
  );
};
