/* eslint-disable no-undef */
/**
 * @issue #28
 */
import * as React from "react";
import {
  Button,
  Spinner,
  Divider,
  MessageBar,
  MessageBarBody,
  makeStyles,
  tokens,
  Text,
} from "@fluentui/react-components";

interface ControlPanelProps {
  onInit: () => Promise<void>;
  onComplianceExport: () => Promise<void>;
  onAnalyze: () => Promise<any>;
  isProcessing: boolean;
  hasErrors: boolean;
  isLoaded: boolean;
}

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  buttonGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  fullWidth: {
    width: "100%",
  },
  exportButton: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "4px",
    height: "auto",
    padding: "12px 8px",
    width: "100%",
  },
  exportIcon: {
    fontSize: "20px",
    lineHeight: "1",
  },
  awaitingText: {
    textAlign: "center",
    fontSize: tokens.fontSizeBase100,
    color: tokens.colorNeutralForeground3,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    fontWeight: tokens.fontWeightSemibold,
    marginTop: "4px",
  },
});

/**
 * ControlPanel: The primary action hub for clinical designers.
 * Migrated to Fluent UI v9.
 */
export const ControlPanel: React.FC<ControlPanelProps> = ({
  onInit,
  onComplianceExport,
  onAnalyze,
  isProcessing,
  hasErrors,
  isLoaded,
}) => {
  const styles = useStyles();
  return (
    <div className={styles.root}>
      <div className={styles.buttonGroup}>
        <Button
          appearance="secondary"
          className={styles.fullWidth}
          onClick={onInit}
          disabled={isProcessing}
          icon={isProcessing ? <Spinner size="tiny" /> : <span>✨</span>}
        >
          Initialize Workbook
        </Button>

        <Button
          appearance="primary"
          className={styles.fullWidth}
          onClick={onAnalyze}
          disabled={isProcessing}
          icon={isProcessing ? <Spinner size="tiny" /> : <span>🔍</span>}
        >
          {isProcessing ? "Analyzing Metadata..." : "Run Workbook Analysis"}
        </Button>
      </div>

      <Divider />

      <Button
        appearance="primary"
        className={styles.exportButton}
        onClick={onComplianceExport}
        disabled={isProcessing || hasErrors || !isLoaded}
      >
        <span className={styles.exportIcon}>📦</span>
        <span>Compliance Export</span>
      </Button>

      {hasErrors && (
        <MessageBar intent="error">
          <MessageBarBody>
            Critical errors detected. Resolve highlighted issues in Excel to unlock export.
          </MessageBarBody>
        </MessageBar>
      )}

      {!isLoaded && !hasErrors && <Text className={styles.awaitingText}>Awaiting Analysis</Text>}
    </div>
  );
};
