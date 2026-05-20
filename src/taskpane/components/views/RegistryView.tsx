import * as React from "react";
import { Body1, Button, Card, Spinner, makeStyles, tokens } from "@fluentui/react-components";
import { SubmissionMetadata } from "../../core/types";
import { SubmissionMetadataView } from "./SubmissionMetadataView";
import { SpreadsheetIngestionWizard } from "./SpreadsheetIngestionWizard";

interface RegistryProps {
  onInit: () => Promise<void>;
  onSync: () => Promise<void>;
  onLoadSubmissionMetadata: () => Promise<void>;
  onSaveSubmissionMetadata: (submissionMetadata: SubmissionMetadata) => void;
  activeSheet: string;
  submissionMetadata?: SubmissionMetadata;
  isProcessing: boolean;
}

const useStyles = makeStyles({
  container: {
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
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "8px",
  },
  cardTitle: {
    fontSize: tokens.fontSizeBase400,
    fontWeight: tokens.fontWeightBold,
    color: tokens.colorNeutralForeground1,
  },
  cardDesc: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    marginBottom: "16px",
    lineHeight: "1.5",
  },
  buttonGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  fullWidthButton: {
    width: "100%",
    justifyContent: "flex-start",
  },
});

export const RegistryView: React.FC<RegistryProps> = ({
  onInit,
  onSync,
  onLoadSubmissionMetadata,
  onSaveSubmissionMetadata,
  activeSheet,
  submissionMetadata,
  isProcessing,
}) => {
  const styles = useStyles();
  const [showIngestionWizard, setShowIngestionWizard] = React.useState(false);

  if (showIngestionWizard) {
    return <SpreadsheetIngestionWizard onClose={() => setShowIngestionWizard(false)} />;
  }

  return (
    <div className={styles.container}>
      <Card className={styles.card}>
        <div className={styles.cardHeader}>
          <span role="img" aria-label="registry">
            🏛️
          </span>
          <Body1 className={styles.cardTitle}>System Registry</Body1>
        </div>
        <Body1 className={styles.cardDesc}>
          Define your global protocol and register your forms here. Sync to generate authoring tabs.
        </Body1>
        <div className={styles.buttonGroup}>
          <Button
            appearance="outline"
            className={styles.fullWidthButton}
            onClick={onInit}
            disabled={isProcessing}
            icon={isProcessing ? <Spinner size="tiny" /> : <span>✨</span>}
          >
            Initialize Canvas
          </Button>
          <Button
            appearance="primary"
            className={styles.fullWidthButton}
            onClick={onSync}
            disabled={isProcessing}
            icon={isProcessing ? <Spinner size="tiny" /> : <span>🔄</span>}
          >
            Sync Form Sheets
          </Button>
          <Button
            appearance="outline"
            className={styles.fullWidthButton}
            onClick={() => setShowIngestionWizard(true)}
            disabled={isProcessing}
            icon={<span>📥</span>}
          >
            Import Legacy CRF…
          </Button>
        </div>
      </Card>
      {activeSheet === "_Study" && (
        <SubmissionMetadataView
          submissionMetadata={submissionMetadata}
          isProcessing={isProcessing}
          onLoad={onLoadSubmissionMetadata}
          onSave={onSaveSubmissionMetadata}
        />
      )}
    </div>
  );
};
