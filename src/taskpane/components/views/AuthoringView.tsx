import * as React from "react";
import { Body1, Button, Card, Spinner, makeStyles, tokens } from "@fluentui/react-components";
import { insertDateBlock, insertAEBlock } from "../../core/services/authoring-service";

interface AuthoringProps {
  sheetName: string;
  onValidate: () => void;
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
  cardTitle: {
    fontSize: tokens.fontSizeBase400,
    fontWeight: tokens.fontWeightBold,
    color: tokens.colorNeutralForeground1,
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "4px",
  },
  cardSubtitle: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    marginBottom: "16px",
  },
  buttonGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  actionButton: {
    width: "100%",
    justifyContent: "flex-start",
  },
  tagLabel: {
    fontSize: tokens.fontSizeBase100,
    color: tokens.colorNeutralForeground3,
    marginLeft: "auto",
  },
  validateButton: {
    width: "100%",
  },
});

export const AuthoringView: React.FC<AuthoringProps> = ({
  sheetName,
  onValidate,
  isProcessing,
}) => {
  const styles = useStyles();
  const [insertingDate, setInsertingDate] = React.useState(false);
  const [insertingAE, setInsertingAE] = React.useState(false);

  const handleInsertDateBlock = async () => {
    setInsertingDate(true);
    try {
      await insertDateBlock();
    } finally {
      setInsertingDate(false);
    }
  };

  const handleInsertAEBlock = async () => {
    setInsertingAE(true);
    try {
      await insertAEBlock();
    } finally {
      setInsertingAE(false);
    }
  };

  return (
    <div className={styles.container}>
      <Card className={styles.card}>
        <Body1 className={styles.cardTitle}>
          <span>📝</span> Authoring: {sheetName}
        </Body1>
        <Body1 className={styles.cardSubtitle}>Context-aware tools for this form.</Body1>

        <div className={styles.buttonGroup}>
          <Button
            appearance="outline"
            className={styles.actionButton}
            onClick={handleInsertDateBlock}
            disabled={isProcessing || insertingDate || insertingAE}
            icon={insertingDate ? <Spinner size="tiny" /> : <span>📅</span>}
          >
            {insertingDate ? "Inserting..." : "Insert Date Group"}
            {!insertingDate && <span className={styles.tagLabel}>CDISC</span>}
          </Button>
          <Button
            appearance="outline"
            className={styles.actionButton}
            onClick={handleInsertAEBlock}
            disabled={isProcessing || insertingDate || insertingAE}
            icon={insertingAE ? <Spinner size="tiny" /> : <span>⚠️</span>}
          >
            {insertingAE ? "Inserting..." : "Insert AE Block"}
            {!insertingAE && <span className={styles.tagLabel}>Log</span>}
          </Button>
        </div>
      </Card>

      <Button
        appearance="secondary"
        className={styles.validateButton}
        onClick={onValidate}
        disabled={isProcessing}
        icon={isProcessing ? <Spinner size="tiny" /> : <span>🔍</span>}
      >
        Validate {sheetName}
      </Button>
    </div>
  );
};
