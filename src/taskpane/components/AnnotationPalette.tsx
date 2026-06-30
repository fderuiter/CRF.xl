/**
 * @issue #84
 */
import * as React from "react";
import {
  makeStyles,
  tokens,
  Card,
  Body1,
  Textarea,
  Dropdown,
  Option,
  Label,
  Switch,
  Badge,
  Button,
  Tooltip,
} from "@fluentui/react-components";
import {
  CheckmarkCircle16Regular,
  Warning16Regular,
  DismissCircle16Regular,
  Delete16Regular,
  History16Regular,
  ArrowImport16Regular,
  Info16Regular,
} from "@fluentui/react-icons";
import { AnnotationType } from "../core/types";
import { annotationPaintbrushService } from "../core/services/annotation-paintbrush-service";
import { getRepairPolicy } from "../core/validators/annotation-validator";
import { bindingService } from "../core/services/binding-service";

const useStyles = makeStyles({
  container: {
    padding: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontWeight: tokens.fontWeightBold,
    fontSize: tokens.fontSizeBase300,
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  activeIndicator: {
    marginTop: "8px",
    padding: "8px",
    borderRadius: tokens.borderRadiusSmall,
    backgroundColor: tokens.colorBrandBackground2,
    border: `1px solid ${tokens.colorBrandStroke2}`,
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    fontSize: tokens.fontSizeBase200,
  },
  targetList: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    maxHeight: "150px",
    overflowY: "auto",
    padding: "4px",
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusSmall,
    backgroundColor: tokens.colorNeutralBackground1,
  },
  targetItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "4px 6px",
    fontSize: tokens.fontSizeBase100,
    borderRadius: tokens.borderRadiusSmall,
    ":hover": {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
  targetAddress: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    flex: 1,
    minWidth: 0,
  },
  addressText: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  actions: {
    display: "flex",
    gap: "8px",
    marginTop: "8px",
  },
  sourceBox: {
    padding: "8px",
    borderRadius: tokens.borderRadiusSmall,
    border: `1px dashed ${tokens.colorNeutralStroke1}`,
    backgroundColor: tokens.colorNeutralBackground3,
    fontSize: tokens.fontSizeBase200,
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  }
});

export const AnnotationPalette: React.FC = () => {
  const styles = useStyles();
  const [state, setState] = React.useState(annotationPaintbrushService.getState());

  React.useEffect(() => {
    return annotationPaintbrushService.subscribe(setState);
  }, []);

  const handleToggle = (_ev: any, data: { checked: boolean }) => {
    annotationPaintbrushService.setEnabled(data.checked);
  };

  const handleTypeChange = (_ev: any, data: { optionValue?: string }) => {
    if (data.optionValue) {
      annotationPaintbrushService.setType(data.optionValue as AnnotationType);
    }
  };

  const handleContentChange = (_ev: any, data: { value: string }) => {
    annotationPaintbrushService.setContent(data.value);
  };

  const handlePickSource = async () => {
    const context = bindingService.getCurrentContext();
    if (context && context.isValid) {
      await annotationPaintbrushService.pickSourceFromSelection(context.sheetName, context.address);
    }
  };

  const handleApply = async () => {
    try {
      await annotationPaintbrushService.executeBulkApply();
    } catch (e: any) {
      console.error(e.message);
    }
  };

  const handleUndo = async () => {
    await annotationPaintbrushService.undoLastOperation();
  };

  const handleClear = () => {
    annotationPaintbrushService.clearTargets();
  };

  const getValidationIcon = (t: {sheetName: string, address: string}) => {
    const key = `${t.sheetName}!${t.address}`;
    const issues = state.validationIssues[key];
    if (!issues || issues.length === 0) {
      return <CheckmarkCircle16Regular style={{ color: tokens.colorPaletteGreenForeground1 }} />;
    }

    const hasBlock = issues.some(i => getRepairPolicy(i).action === "Block");
    const message = issues.map(i => i.message).join("\n");

    return (
      <Tooltip content={message} relationship="label">
        {hasBlock ? (
          <DismissCircle16Regular style={{ color: tokens.colorPaletteRedForeground1 }} />
        ) : (
          <Warning16Regular style={{ color: tokens.colorPaletteYellowForeground1 }} />
        )}
      </Tooltip>
    );
  };

  return (
    <Card className={styles.container}>
      <div className={styles.header}>
        <div className={styles.title}>
          <span>🖌️</span> Annotation Paintbrush
        </div>
        <Switch
          label={state.isEnabled ? "ON" : "OFF"}
          checked={state.isEnabled}
          onChange={handleToggle}
        />
      </div>

      <div className={styles.field}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <Label htmlFor="anno-type">Annotation Template</Label>
            <Button
                size="small"
                appearance="subtle"
                icon={<ArrowImport16Regular />}
                onClick={handlePickSource}
            >
                Pick Source
            </Button>
        </div>
        <div className={styles.sourceBox}>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <Badge size="small" appearance="outline" color="brand">{state.activeType}</Badge>
                <Body1 italic={!state.activeContent}>{state.activeContent || "Empty content"}</Body1>
            </div>
        </div>
      </div>

      <div className={styles.field}>
        <Label htmlFor="anno-type">Change Type</Label>
        <Dropdown
          id="anno-type"
          value={state.activeType}
          selectedOptions={[state.activeType]}
          onOptionSelect={handleTypeChange}
          size="small"
        >
          {Object.values(AnnotationType).map((type) => (
            <Option key={type} value={type}>
              {type}
            </Option>
          ))}
        </Dropdown>
      </div>

      <div className={styles.field}>
        <Label htmlFor="anno-content">Edit Content</Label>
        <Textarea
          id="anno-content"
          value={state.activeContent}
          onChange={handleContentChange}
          placeholder="Enter annotation text..."
          size="small"
          rows={2}
        />
      </div>

      {state.isEnabled && (
        <div className={styles.activeIndicator}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <Badge color="brand" appearance="filled" size="small">Active</Badge>
                <Body1 style={{ fontWeight: tokens.fontWeightBold }}>Targets ({state.pendingTargets.length})</Body1>
            </div>
            {state.pendingTargets.length > 0 && (
                <Button size="small" appearance="subtle" icon={<Delete16Regular />} onClick={handleClear} />
            )}
          </div>

          <div className={styles.targetList}>
            {state.pendingTargets.length === 0 ? (
                <Body1 style={{ padding: "8px", color: tokens.colorNeutralForeground4, textAlign: "center" }}>
                    Select cells in the workbook to add targets
                </Body1>
            ) : (
                state.pendingTargets.map((t, idx) => (
                    <div key={`${t.sheetName}!${t.address}-${idx}`} className={styles.targetItem}>
                        <div className={styles.targetAddress}>
                            {getValidationIcon(t)}
                            <span className={styles.addressText}>{t.sheetName}!{t.address}</span>
                        </div>
                        <Button
                            size="small"
                            appearance="subtle"
                            icon={<DismissCircle16Regular fontSize={12} />}
                            onClick={() => annotationPaintbrushService.toggleTarget(t.sheetName, t.address)}
                        />
                    </div>
                ))
            )}
          </div>

          <div className={styles.actions}>
            <Button
                appearance="primary"
                size="small"
                style={{ flex: 1 }}
                disabled={state.pendingTargets.length === 0 || Object.values(state.validationIssues).some(issues => issues.some(i => getRepairPolicy(i).action === "Block"))}
                onClick={handleApply}
            >
                Apply to {state.pendingTargets.length} Targets
            </Button>
            <Tooltip content="Undo last bulk apply" relationship="label">
                <Button
                    appearance="outline"
                    size="small"
                    icon={<History16Regular />}
                    disabled={state.history.length === 0}
                    onClick={handleUndo}
                />
            </Tooltip>
          </div>

          <div style={{ display: "flex", gap: "4px", alignItems: "center", color: tokens.colorNeutralForeground4, fontSize: tokens.fontSizeBase100 }}>
            <Info16Regular />
            <span>Select cells in Excel to toggle targets.</span>
          </div>
        </div>
      )}
    </Card>
  );
};
