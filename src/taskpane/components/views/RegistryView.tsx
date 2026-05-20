import * as React from "react";
import {
  Body1,
  Button,
  Card,
  MessageBar,
  MessageBarBody,
  Spinner,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import { StudyDesign, SubmissionMetadata } from "../../core/types";
import { SubmissionMetadataView } from "./SubmissionMetadataView";
import { SpreadsheetIngestionWizard } from "./SpreadsheetIngestionWizard";
import { OdmImportWizard } from "./OdmImportWizard";

interface RegistryProps {
  onInit: () => Promise<void>;
  onSync: () => Promise<void>;
  onLoadSubmissionMetadata: () => Promise<void>;
  onLoadBaselineWorkbook: (file: File) => Promise<void>;
  onSaveSubmissionMetadata: (submissionMetadata: SubmissionMetadata) => void;
  activeSheet: string;
  submissionMetadata?: SubmissionMetadata;
  baselineStudy?: StudyDesign | null;
  baselineError?: string | null;
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
  onLoadBaselineWorkbook,
  onSaveSubmissionMetadata,
  activeSheet,
  submissionMetadata,
  baselineStudy,
  baselineError,
  isProcessing,
}) => {
  const styles = useStyles();
  const [showIngestionWizard, setShowIngestionWizard] = React.useState(false);
  const [showOdmWizard, setShowOdmWizard] = React.useState(false);
  const baselineFileInputRef = React.useRef<HTMLInputElement | null>(null);

  const handleBaselineFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    event.target.value = "";
    if (!selectedFile) return;
    await onLoadBaselineWorkbook(selectedFile);
  };

  if (showIngestionWizard) {
    return <SpreadsheetIngestionWizard onClose={() => setShowIngestionWizard(false)} />;
  }

  if (showOdmWizard) {
    return <OdmImportWizard onClose={() => setShowOdmWizard(false)} />;
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
            onClick={() => baselineFileInputRef.current?.click()}
            disabled={isProcessing}
            icon={<span>🧭</span>}
          >
            Select Baseline Workbook…
          </Button>
          <input
            ref={baselineFileInputRef}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            style={{ display: "none" }}
            onChange={(event) => {
              void handleBaselineFileChange(event);
            }}
          />
          <Button
            appearance="outline"
            className={styles.fullWidthButton}
            onClick={() => setShowIngestionWizard(true)}
            disabled={isProcessing}
            icon={<span>📥</span>}
          >
            Import Legacy CRF…
          </Button>
          <Button
            appearance="outline"
            className={styles.fullWidthButton}
            onClick={() => setShowOdmWizard(true)}
            disabled={isProcessing}
            icon={<span>🔄</span>}
          >
            Import ODM XML…
          </Button>
        </div>
      </Card>
      {baselineStudy && (
        <MessageBar intent="success">
          <MessageBarBody>
            Baseline workbook loaded: <strong>{baselineStudy.metadata.protocolId}</strong> —{" "}
            {baselineStudy.metadata.studyName} ({Object.keys(baselineStudy.forms).length} forms)
          </MessageBarBody>
        </MessageBar>
      )}
      {baselineError && (
        <MessageBar intent="error">
          <MessageBarBody>{baselineError}</MessageBarBody>
        </MessageBar>
      )}
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
