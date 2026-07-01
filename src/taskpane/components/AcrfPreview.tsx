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
import { ArrowDownloadRegular, ArrowClockwiseRegular, CheckmarkCircleRegular, EyeRegular, CommentRegular } from "@fluentui/react-icons";
import { StudyDesign, AcrfVerificationResult, ReviewerComment } from "../core/types";
import { navigateToSource } from "../core";
import { renderToHtml } from "../core/services/acrf-renderer";
import { exportToPdf } from "../core/services/pdf-export-adapter";
import { AnnotatedCrfPipeline } from "../core/generators/annotated-crf-pipeline";
import { ValidationLog } from "./ValidationLog";
import { ReviewMode } from "./ReviewMode";

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
    width: "30%",
    minWidth: "250px",
    maxWidth: "400px",
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
  acknowledgedWarnings?: Set<string>;
  onAcknowledge?: (key: string) => void;
  reviewComments?: ReviewerComment[];
  onAddReviewComment?: (text: string, entityId: string) => Promise<void>;
  onResolveReviewComment?: (id: string) => Promise<void>;
  onReopenReviewComment?: (id: string) => Promise<void>;
  onDeleteReviewComment?: (id: string) => Promise<void>;
  onRefreshPreview?: () => Promise<void>;
}

export const AcrfPreview: React.FC<AcrfPreviewProps> = ({
  study,
  acknowledgedWarnings,
  onAcknowledge,
  reviewComments = [],
  onAddReviewComment,
  onResolveReviewComment,
  onReopenReviewComment,
  onDeleteReviewComment,
  onRefreshPreview,
}) => {
  const styles = useStyles();
  const [html, setHtml] = React.useState<string>("");
  const [isExporting, setIsExporting] = React.useState(false);
  const [isVerifying, setIsVerifying] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [verification, setVerification] = React.useState<AcrfVerificationResult | null>(null);
  const [pdfBlob, setPdfBlob] = React.useState<Blob | null>(null);
  const [selectedEntityId, setSelectedEntityId] = React.useState<string | null>(null);
  const [showReviewPane, setShowReviewPane] = React.useState(false);

  const runVerification = React.useCallback(async () => {
    setIsVerifying(true);
    setError(null);
    try {
      const pipeline = new AnnotatedCrfPipeline();
      const result = await pipeline.execute();

      const renderedHtml = renderToHtml(result.document);
      setHtml(renderedHtml);
      setVerification(result.verificationResult || null);
      if (result.blob) {
        setPdfBlob(result.blob);
      }
    } catch (e: any) {
      setError(`Failed to run aCRF pipeline: ${e.message}`);
    } finally {
      setIsVerifying(false);
    }
  }, []);

  React.useEffect(() => {
    runVerification();
  }, [runVerification]);

  const handleExport = async () => {
    setIsExporting(true);
    setError(null);
    try {
      const filename = `${study.metadata.protocolId}_AnnotatedCRF_v${study.metadata.version}.pdf`;

      if (pdfBlob) {
        const url = window.URL.createObjectURL(pdfBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        // Fallback to HTML-based export if blob not available
        await exportToPdf(html, filename);
      }
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
        <Button
          icon={<CommentRegular />}
          appearance={showReviewPane ? "primary" : "outline"}
          onClick={() => setShowReviewPane(!showReviewPane)}
        >
          Review Mode
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
            <MessageBar intent="error" style={{ marginBottom: "10px" }}>
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
            onLoad={(e) => {
               // Add click listeners to items in the iframe to select them for commenting
               const iframe = e.currentTarget;
               if (iframe.contentDocument) {
                  iframe.contentDocument.addEventListener('click', (ev) => {
                     const target = ev.target as HTMLElement;
                     const itemRow = target.closest('.item-row');
                     if (itemRow) {
                        // Extract OID from the first annotation box or similar
                        // In a real implementation, we'd add data-oid to the HTML
                        const labelText = itemRow.querySelector('.item-label')?.textContent;
                        if (labelText) {
                           // For now, use the label as a proxy for OID if not found
                           // Better: find a way to pass OID from renderer to HTML
                           const sdtmBox = itemRow.querySelector('.annotation-box');
                           const match = sdtmBox?.textContent?.match(/\[(.*?)\]/);
                           if (match) {
                              setSelectedEntityId(match[1]);
                              setShowReviewPane(true);
                           }
                        }
                     }
                  });
               }
            }}
          />
        </div>

        {showReviewPane && (
           <ReviewMode
              comments={reviewComments}
              selectedEntityId={selectedEntityId}
              onAddComment={async (text, id) => {
                 await onAddReviewComment?.(text, id);
                 await runVerification();
                 onRefreshPreview?.();
              }}
              onResolveComment={async (id) => {
                 await onResolveReviewComment?.(id);
                 await runVerification();
                 onRefreshPreview?.();
              }}
              onReopenComment={async (id) => {
                 await onReopenReviewComment?.(id);
                 await runVerification();
                 onRefreshPreview?.();
              }}
              onDeleteComment={async (id) => {
                 await onDeleteReviewComment?.(id);
                 await runVerification();
                 onRefreshPreview?.();
              }}
           />
        )}

        <div className={styles.sidebar}>
          <Body1 style={{ fontWeight: tokens.fontWeightSemibold }}>Verification Results</Body1>
          <ValidationLog
            issues={verification?.issues.map((i) => ({
              level: i.severity === "error" ? "Error" : "Warning",
              message: i.message,
              location: i.location || i.category,
              category: i.category,
              entityId: i.entityId,
              isAcknowledged: acknowledgedWarnings?.has(i.message + (i.location || i.category))
            })) || []}
            isProcessing={isVerifying}
            onNavigate={(issue: any) => {
              if (issue.location && study.forms[issue.location]) {
                const iframe = document.querySelector('iframe');
                if (iframe?.contentWindow) {
                  iframe.contentWindow.location.hash = `#form-${issue.location}`;
                }
                // Also navigate in Excel
                navigateToSource(issue.location, 0);
              }
            }}
            renderActions={(issue: any) => (
              <div style={{ display: "flex", gap: "4px", marginTop: "4px" }}>
                {issue.level === "Warning" && onAcknowledge && (
                  <Button
                    size="small"
                    icon={<CheckmarkCircleRegular />}
                    onClick={() => onAcknowledge(issue.message + issue.location)}
                  >
                    {issue.isAcknowledged ? "Unacknowledge" : "Acknowledge"}
                  </Button>
                )}
                {issue.location && (
                   <Button
                    size="small"
                    icon={<EyeRegular />}
                    onClick={() => {
                      const iframe = document.querySelector('iframe');
                      if (iframe?.contentWindow) {
                        iframe.contentWindow.location.hash = `#form-${issue.location}`;
                      }
                      navigateToSource(issue.location, 0);
                    }}
                  >
                    View Source
                  </Button>
                )}
              </div>
            )}
          />
        </div>
      </div>
    </div>
  );
};
