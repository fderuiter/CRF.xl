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
} from "@fluentui/react-components";
import { AnnotationType } from "../core/types";
import { annotationPaintbrushService } from "../core/services/annotation-paintbrush-service";

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
    alignItems: "center",
    gap: "8px",
    fontSize: tokens.fontSizeBase200,
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
        <Label htmlFor="anno-type">Annotation Type</Label>
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
        <Label htmlFor="anno-content">Content Template</Label>
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
          <Badge color="brand" appearance="filled" size="small">Active</Badge>
          <Body1>
            Click cells in the workbook to apply <strong>{state.activeType}</strong> annotations.
          </Body1>
        </div>
      )}
    </Card>
  );
};
