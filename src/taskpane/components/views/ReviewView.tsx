/**
 * @issue #57
 */
import * as React from "react";
import {
  makeStyles,
  tokens,
  Button,
  Text,
  Badge,
  Body1,
  Subtitle1,
  Card,
} from "@fluentui/react-components";
import { CheckmarkCircleRegular, WarningRegular, ChevronRightRegular } from "@fluentui/react-icons";
import {
  StudyDesign,
  ValidationIssue,
  AcrfVerificationResult,
  AcrfVerificationIssue,
} from "../../core";
import { AcrfPreview } from "../AcrfPreview";
import { useReviewSession } from "../../hooks/useReviewSession";

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    gap: "16px",
  },
  workflowHeader: {
    padding: "16px",
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusXLarge,
    boxShadow: tokens.shadow4,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
  },
  stagesContainer: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "12px",
    gap: "4px",
  },
  stage: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "4px",
    flex: 1,
    textAlign: "center",
  },
  stageCircle: {
    width: "24px",
    height: "24px",
    borderRadius: "50%",
    border: `2px solid ${tokens.colorNeutralStroke1}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "12px",
    fontWeight: tokens.fontWeightBold,
  },
  stageActive: {
    borderColor: tokens.colorBrandStroke1,
    color: tokens.colorBrandForeground1,
  } as any,
  stageComplete: {
    backgroundColor: tokens.colorStatusSuccessBackground1,
    borderColor: tokens.colorStatusSuccessBorder1,
    color: tokens.colorStatusSuccessForeground1,
  } as any,
  stageLabel: {
    fontSize: tokens.fontSizeBase100,
  },
  statusBanner: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "12px",
    borderRadius: tokens.borderRadiusMedium,
    marginBottom: "8px",
  },
  ready: {
    backgroundColor: tokens.colorStatusSuccessBackground1,
    border: `1px solid ${tokens.colorStatusSuccessBorder1}`,
  },
  notReady: {
    backgroundColor: tokens.colorStatusWarningBackground1,
    border: `1px solid ${tokens.colorStatusWarningBorder1}`,
  },
  content: {
    display: "flex",
    flex: 1,
    gap: "16px",
    overflow: "hidden",
  },
  sidebar: {
    width: "200px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    overflowY: "auto",
    paddingRight: "8px",
    backgroundColor: tokens.colorNeutralBackground1,
    padding: "12px",
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
  },
  mainPreview: {
    flex: 1,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
  },
  formNavItem: {
    justifyContent: "flex-start",
    textAlign: "left",
    width: "100%",
  },
});

interface ReviewViewProps {
  study: StudyDesign;
  issues: ValidationIssue[];
}

export const ReviewView: React.FC<ReviewViewProps> = ({ study, issues }) => {
  const styles = useStyles();
  const [acknowledgedWarnings, setAcknowledgedWarnings] = React.useState<Set<string>>(new Set());
  const [pipelineVerification, setPipelineVerification] =
    React.useState<AcrfVerificationResult | null>(null);

  // Review Mode state
  const { comments, addComment, resolveComment, reopenComment, deleteComment, refreshComments } =
    useReviewSession("Clinical Reviewer");

  // Determine readiness based on pipeline verification if available, otherwise fallback to general issues
  const verificationIssues = pipelineVerification?.issues || [];
  const criticalErrors = pipelineVerification
    ? verificationIssues.filter((i) => i.severity === "error")
    : issues.filter((i) => i.level === "Error");

  const warnings = pipelineVerification
    ? verificationIssues.filter((i) => i.severity === "warning")
    : issues.filter((i) => i.level === "Warning");

  const unacknowledgedWarnings = warnings.filter((w) => {
    const key = pipelineVerification
      ? w.message + (w.location || (w as AcrfVerificationIssue).category)
      : (w as ValidationIssue).message + (w as ValidationIssue).location;
    return !acknowledgedWarnings.has(key);
  });

  const isReady = criticalErrors.length === 0 && unacknowledgedWarnings.length === 0;

  const stages: { label: string; status: "complete" | "active" | "pending" }[] = [
    { label: "Enter", status: "complete" as const },
    {
      label: "Inspect",
      status: (verificationIssues.length > 0 ? "active" : "complete") as any,
    },
    { label: "Navigate", status: "active" as const },
    {
      label: "Fix/Ack",
      status: (unacknowledgedWarnings.length > 0 ? "active" : "complete") as any,
    },
    { label: "Re-run", status: "active" as const },
    { label: "Ready", status: (isReady ? "complete" : "pending") as any },
  ];

  const handleAcknowledge = (issueKey: string) => {
    const next = new Set(acknowledgedWarnings);
    if (next.has(issueKey)) {
      next.delete(issueKey);
    } else {
      next.add(issueKey);
    }
    setAcknowledgedWarnings(next);
  };

  return (
    <div className={styles.root} id="tour-review-mode">
      <Card className={styles.workflowHeader}>
        <div
          className={
            isReady
              ? `${styles.statusBanner} ${styles.ready}`
              : `${styles.statusBanner} ${styles.notReady}`
          }
        >
          {isReady ? <CheckmarkCircleRegular /> : <WarningRegular />}
          <Subtitle1>{isReady ? "Export Ready" : "Review in Progress"}</Subtitle1>
          <Badge
            appearance="tint"
            color={isReady ? "success" : "warning"}
            style={{ marginLeft: "auto" }}
          >
            {criticalErrors.length} Errors | {unacknowledgedWarnings.length} Pending Warnings
          </Badge>
        </div>

        <div className={styles.stagesContainer}>
          {stages.map((stage, idx) => (
            <React.Fragment key={idx}>
              <div className={styles.stage}>
                <div
                  className={`${styles.stageCircle} ${stage.status === "active" ? styles.stageActive : ""} ${stage.status === "complete" ? styles.stageComplete : ""}`}
                >
                  {stage.status === "complete" ? <CheckmarkCircleRegular /> : idx + 1}
                </div>
                <Text className={styles.stageLabel}>{stage.label}</Text>
              </div>
              {idx < stages.length - 1 && (
                <ChevronRightRegular
                  style={{ color: tokens.colorNeutralStroke1, fontSize: "12px" }}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </Card>

      <div className={styles.content}>
        <div className={styles.sidebar}>
          <Text
            weight="semibold"
            size={200}
            style={{
              marginBottom: "8px",
              color: tokens.colorNeutralForeground3,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Form Navigation
          </Text>
          {Object.keys(study.forms).map((formOid) => (
            <Button
              key={formOid}
              appearance="subtle"
              size="small"
              className={styles.formNavItem}
              onClick={() => {
                const iframe = document.querySelector("iframe");
                if (iframe?.contentWindow) {
                  // We'll implement anchor support in acrf-renderer.ts
                  iframe.contentWindow.location.hash = `#form-${formOid}`;
                }
              }}
            >
              {study.forms[formOid].formName}
            </Button>
          ))}
          {Object.keys(study.forms).length === 0 && (
            <Body1 style={{ fontStyle: "italic", color: tokens.colorNeutralForeground4 }}>
              No forms available
            </Body1>
          )}
        </div>

        <div className={styles.mainPreview}>
          <AcrfPreview
            study={study}
            validationIssues={issues}
            acknowledgedWarnings={acknowledgedWarnings}
            onAcknowledge={handleAcknowledge}
            reviewComments={comments}
            onAddReviewComment={async (text, entityId) => {
              await addComment(text, entityId);
            }}
            onResolveReviewComment={resolveComment}
            onReopenReviewComment={reopenComment}
            onDeleteReviewComment={deleteComment}
            onRefreshPreview={refreshComments}
            onPipelineVerification={setPipelineVerification}
          />
        </div>
      </div>
    </div>
  );
};
