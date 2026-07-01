/**
 * @issue #78
 */
import * as React from "react";
import {
  Button,
  Spinner,
  MessageBar,
  MessageBarTitle,
  MessageBarBody,
  Body1,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import { ArrowDownloadRegular, ArrowClockwiseRegular } from "@fluentui/react-icons";
import { StudyDesign, AcrfVerificationResult } from "../core/types";
import { buildAnnotatedCrfDocument, renderToHtml } from "../core/services/acrf-renderer";
import { exportToPdf } from "../core/services/pdf-export-adapter";
import { verifyAnnotatedCrf } from "../core/validators/acrf-output-validator";
import { ValidationLog } from "./ValidationLog";

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    backgroundColor: tokens.colorNeutralBackground2,
  },
  toolbar: {
    padding: "10px",
    display: "flex",
    gap: "10px",
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
    backgroundColor: tokens.colorNeutralBackground1,
  },
  previewContainer: {
    flex: 1,
    overflowY: "auto",
    padding: "20px",
  },
  previewFrame: {
    width: "100%",
    minHeight: "600px",
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    backgroundColor: "white",
    boxShadow: tokens.shadow4,
  },
  sidebar: {
    width: "300px",
    borderLeft: `1px solid ${tokens.colorNeutralStroke1}`,
    padding: "10px",
    backgroundColor: tokens.colorNeutralBackground1,
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    overflowY: "auto",
  },
  contentLayout: {
    display: "flex",
    flex: 1,
    overflow: "hidden",
  },
  loadingContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    gap: "10px",
  },
});

interface AcrfPreviewProps {
  study: StudyDesign;
  validationIssues?: any[];
}

export const AcrfPreview: React.FC<AcrfPreviewProps> = ({ study, validationIssues = [] }) => {
  const styles = useStyles();
  const [html, setHtml] = React.useState<string>("");
  const [isExporting, setIsExporting] = React.useState(false);
  const [isVerifying, setIsVerifying] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [verification, setVerification] = React.useState<AcrfVerificationResult | null>(null);

  const runVerification = React.useCallback(() => {
    setIsVerifying(true);
    try {
      const doc = buildAnnotatedCrfDocument(study, validationIssues);
      const renderedHtml = renderToHtml(doc);
      setHtml(renderedHtml);

      const result = verifyAnnotatedCrf(study, doc);
      setVerification(result);
    } catch (e: any) {
      setError(`Failed to generate preview or verify: ${e.message}`);
    } finally {
      setIsVerifying(false);
    }
  }, [study, validationIssues]);

  React.useEffect(() => {
    runVerification();
  }, [runVerification]);

  const handleExport = async () => {
    setIsExporting(true);
    setError(null);
    try {
      const filename = `${study.metadata.protocolId}_AnnotatedCRF_v${study.metadata.version}.pdf`;
      await exportToPdf(html, filename);
    } catch (e: any) {
      setError(`Export failed: ${e.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  if (!html && !error) {
    return (
      <div className={styles.loadingContainer}>
        <Spinner label="Generating aCRF Preview..." />
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <div className={styles.toolbar}>
        <Button
          icon={<ArrowDownloadRegular />}
          appearance="primary"
          onClick={handleExport}
          disabled={isExporting || isVerifying || !!error || verification?.isValid === false}
        >
          {isExporting ? "Exporting..." : "Export to PDF"}
        </Button>
        <Button
          icon={<ArrowClockwiseRegular />}
          onClick={runVerification}
          disabled={isExporting || isVerifying}
        >
          Re-verify
        </Button>
      </div>

      <div className={styles.contentLayout}>
        <div className={styles.previewContainer}>
          {error && (
            <MessageBar intent="error" style={{ marginBottom: "10px" }}>
              <MessageBarBody>
                <MessageBarTitle>Error</MessageBarTitle>
                {error}
              </MessageBarBody>
            </MessageBar>
          )}

          {verification?.isValid === false && (
            <MessageBar intent="warning" style={{ marginBottom: "10px" }}>
              <MessageBarBody>
                <MessageBarTitle>Blocking Verification Issues</MessageBarTitle>
                Please resolve the errors in the Diagnostic Log before exporting.
              </MessageBarBody>
            </MessageBar>
          )}

          <iframe
            title="aCRF Preview"
            srcDoc={html}
            className={styles.previewFrame}
            sandbox="allow-same-origin"
          />
        </div>

        <div className={styles.sidebar}>
          <Body1 style={{ fontWeight: tokens.fontWeightSemibold }}>Verification Results</Body1>
          <ValidationLog
            issues={verification?.issues.map((i) => ({
              level: i.severity === "error" ? "Error" : "Warning",
              message: i.message,
              location: i.location || i.category,
            })) || []}
            isProcessing={isVerifying}
          />
        </div>
      </div>
    </div>
  );
};
