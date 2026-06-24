/**
 * @issue #28
 */
import * as React from "react";
import {
  makeStyles,
  tokens,
  Button,
  Text,
  Badge,
  MessageBar,
  MessageBarBody,
  Divider,
} from "@fluentui/react-components";
import { ValidationIssue } from "../../core";
import { StudyDiffReport } from "../../core";
import { loadImportManifest } from "../../core";

const useStyles = makeStyles({
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    padding: "16px",
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  feed: {
    maxHeight: "300px",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    borderRadius: "4px",
    padding: "8px",
  },
  feedItem: {
    padding: "8px",
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: "4px",
  },
  footer: {
    display: "flex",
    gap: "8px",
    justifyContent: "flex-end",
    marginTop: "16px",
  },
});

export interface IntegrityHubViewProps {
  issues: ValidationIssue[];
  diffReport: StudyDiffReport | null;
  onSignOff: () => void;
  onExport: () => void;
  isSignedOff: boolean;
  signOffTimestamp: string | null;
}

export const IntegrityHubView: React.FC<IntegrityHubViewProps> = ({
  issues,
  diffReport,
  onSignOff,
  onExport,
  isSignedOff,
  signOffTimestamp,
}) => {
  const styles = useStyles();
  const manifest = loadImportManifest();
  const provenance = manifest?.provenance;

  const criticalIssues = issues.filter((i) => i.level === "Error");
  const warnings = issues.filter((i) => i.level === "Warning");

  const diffCount = diffReport
    ? diffReport.forms.length +
      diffReport.items.length +
      diffReport.codelists.length +
      diffReport.rules.length
    : 0;

  return (
    <div className={styles.container}>
      <Text size={500} weight="semibold">
        Integrity Sign-off Hub
      </Text>

      {/* Integrity Score Summary */}
      <div className={styles.section}>
        <Text weight="semibold">Integrity Score</Text>
        <div style={{ display: "flex", gap: "8px" }}>
          <Badge color={criticalIssues.length === 0 ? "success" : "danger"}>
            {criticalIssues.length} Critical Errors
          </Badge>
          <Badge color={warnings.length === 0 ? "success" : "warning"}>
            {warnings.length} Warnings
          </Badge>
          <Badge color="brand">{diffCount} Changes</Badge>
        </div>
      </div>

      <Divider />

      {/* Audit Feed */}
      <div className={styles.section}>
        <Text weight="semibold">Unified Audit Feed</Text>
        <div className={styles.feed}>
          {provenance && (
            <div className={styles.feedItem}>
              <Badge color="informative">Provenance</Badge>
              <Text block size={200}>
                Imported from {provenance.sourceType} ({provenance.sourceId}) at{" "}
                {new Date(provenance.importedAt).toLocaleString()}
              </Text>
            </div>
          )}
          {criticalIssues.map((issue, idx) => (
            <div key={`err-${idx}`} className={styles.feedItem}>
              <Badge color="danger">Error</Badge>
              <Text block size={200}>
                {issue.location}: {issue.message}
              </Text>
            </div>
          ))}
          {warnings.map((issue, idx) => (
            <div key={`warn-${idx}`} className={styles.feedItem}>
              <Badge color="warning">Warning</Badge>
              <Text block size={200}>
                {issue.location}: {issue.message}
              </Text>
            </div>
          ))}
          {diffReport && diffCount > 0 && (
            <div className={styles.feedItem}>
              <Badge color="brand">Diff</Badge>
              <Text block size={200}>
                {diffCount} expected changes to study design.
              </Text>
            </div>
          )}
          {!provenance && issues.length === 0 && diffCount === 0 && (
            <Text>No integrity signals to display.</Text>
          )}
        </div>
      </div>

      <Divider />

      {/* Status & Actions */}
      <div className={styles.section}>
        {isSignedOff ? (
          <MessageBar intent="success">
            <MessageBarBody>
              Study design locked and signed off at{" "}
              {new Date(signOffTimestamp!).toLocaleString()}. Ready for export.
            </MessageBarBody>
          </MessageBar>
        ) : (
          <MessageBar intent="warning">
            <MessageBarBody>
              Study design is currently unsigned. Review the audit feed and sign off before export.
            </MessageBarBody>
          </MessageBar>
        )}

        <div className={styles.footer}>
          <Button
            appearance="primary"
            onClick={onSignOff}
            disabled={isSignedOff || criticalIssues.length > 0}
          >
            Sign-off
          </Button>
          <Button
            appearance="primary"
            onClick={onExport}
            disabled={!isSignedOff}
          >
            Export
          </Button>
        </div>
      </div>
    </div>
  );
};
