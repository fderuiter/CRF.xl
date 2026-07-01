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
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import { ArrowDownloadRegular } from "@fluentui/react-icons";
import { StudyDesign } from "../core/types";
import { buildAnnotatedCrfDocument, renderToHtml } from "../core/services/acrf-renderer";
import { exportToPdf } from "../core/services/pdf-export-adapter";

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
    minHeight: "800px",
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    backgroundColor: "white",
    boxShadow: tokens.shadow4,
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
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    try {
      const doc = buildAnnotatedCrfDocument(study, validationIssues);
      const renderedHtml = renderToHtml(doc);
      setHtml(renderedHtml);
    } catch (e: any) {
      setError(`Failed to generate preview: ${e.message}`);
    }
  }, [study, validationIssues]);

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
          disabled={isExporting || !!error}
        >
          {isExporting ? "Exporting..." : "Export to PDF"}
        </Button>
      </div>

      <div className={styles.previewContainer}>
        {error && (
          <MessageBar intent="error" style={{ marginBottom: "10px" }}>
            <MessageBarBody>
              <MessageBarTitle>Error</MessageBarTitle>
              {error}
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
    </div>
  );
};
