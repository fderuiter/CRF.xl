import * as React from "react";
import {
  Dialog,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogContent,
  DialogActions,
  Button,
  Textarea,
  Text,
  makeStyles,
  tokens,
  Badge,
} from "@fluentui/react-components";
import { StudyDiffReport, ItemDiffEntry } from "../core/types/diff";

export interface AuditJustification {
  reason: string;
  userId: string;
  timestamp: string;
}

interface AuditOrchestratorModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  report: StudyDiffReport | null;
  justifications: Record<string, AuditJustification>;
  onSaveJustifications: (justifs: Record<string, AuditJustification>) => void;
}

const useStyles = makeStyles({
  changeItem: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    marginBottom: "16px",
    padding: "12px",
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    borderRadius: tokens.borderRadiusMedium,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  diffContent: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
    backgroundColor: tokens.colorNeutralBackground2,
    padding: "8px",
    borderRadius: tokens.borderRadiusSmall,
    fontFamily: "monospace",
    fontSize: "12px",
  },
});

export const AuditOrchestratorModal: React.FC<AuditOrchestratorModalProps> = ({
  isOpen,
  onOpenChange,
  report,
  justifications,
  onSaveJustifications,
}) => {
  const styles = useStyles();
  const [localJustifs, setLocalJustifs] = React.useState<Record<string, AuditJustification>>({});

  React.useEffect(() => {
    if (isOpen) {
      setLocalJustifs(justifications);
    }
  }, [isOpen, justifications]);

  const flaggedItems = React.useMemo(() => {
    if (!report) return [];
    return report.items.filter((item) => {
      if (item.operation === "unchanged") return false;
      const requiresReason = item.current?.requireChangeReason || item.baseline?.requireChangeReason;
      return requiresReason;
    });
  }, [report]);

  const allFilled = flaggedItems.every((item) => {
    const key = `${item.formOid}::${item.itemOid}`;
    return !!localJustifs[key]?.reason.trim();
  });

  const handleReasonChange = (itemKey: string, reason: string) => {
    setLocalJustifs((prev) => ({
      ...prev,
      [itemKey]: {
        reason,
        userId: "current-user", // In a real app this would be actual user
        timestamp: new Date().toISOString(),
      },
    }));
  };

  const handleSave = () => {
    onSaveJustifications(localJustifs);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(_, data) => onOpenChange(data.open)}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Audit Justifications Required</DialogTitle>
          <DialogContent>
            <Text block style={{ marginBottom: "16px" }}>
              The following changes require a justification for GxP compliance.
            </Text>
            {flaggedItems.map((item) => {
              const key = `${item.formOid}::${item.itemOid}`;
              const val = localJustifs[key]?.reason || "";
              
              // Simplistic diff display
              let beforeContent = "";
              let afterContent = "";
              if (item.operation === "removed") {
                beforeContent = JSON.stringify(item.baseline, null, 2);
                afterContent = "Removed";
              } else if (item.operation === "added") {
                beforeContent = "None";
                afterContent = JSON.stringify(item.current, null, 2);
              } else if (item.operation === "modified") {
                const bVal: any = {};
                const cVal: any = {};
                item.changedFields?.forEach(f => {
                  bVal[f] = (item.baseline as any)?.[f];
                  cVal[f] = (item.current as any)?.[f];
                });
                beforeContent = JSON.stringify(bVal, null, 2);
                afterContent = JSON.stringify(cVal, null, 2);
              }

              return (
                <div key={key} className={styles.changeItem}>
                  <div className={styles.header}>
                    <Text weight="bold">{item.itemOid} (Form: {item.formOid})</Text>
                    <Badge appearance="filled" color={item.operation === "removed" ? "danger" : item.operation === "added" ? "success" : "warning"}>
                      {item.operation}
                    </Badge>
                  </div>
                  <div className={styles.diffContent}>
                    <div><strong>Before:</strong><pre>{beforeContent}</pre></div>
                    <div><strong>After:</strong><pre>{afterContent}</pre></div>
                  </div>
                  <Textarea
                    placeholder="Enter reason for change..."
                    value={val}
                    onChange={(e, data) => handleReasonChange(key, data.value)}
                    required
                  />
                </div>
              );
            })}
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={() => onOpenChange(false)}>
              Close (Save Progress)
            </Button>
            <Button appearance="primary" disabled={!allFilled} onClick={handleSave}>
              Save Justifications
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};
