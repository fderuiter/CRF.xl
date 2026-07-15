/**
 * @issue #28
 */
import * as React from "react";
import {
  makeStyles,
  tokens,
  Card,
  Dropdown,
  Option,
  Label,
  Badge,
} from "@fluentui/react-components";
import { bindingService, SelectionContext } from "@crf-xl/taskpane/services/binding-service";

import { loadAnnotationsFromStore, editAnnotation } from "@crf-xl/taskpane/services/annotation-service";

import { Annotation, LifecycleState } from "@crf-xl/core/types/annotation";


const useStyles = makeStyles({
  container: {
    padding: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
  },
  header: {
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
});

export const AnnotationInspector: React.FC = () => {
  const styles = useStyles();
  const [context, setContext] = React.useState<SelectionContext | null>(bindingService.getCurrentContext());
  const [annotation, setAnnotation] = React.useState<Annotation | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    const unsubscribe = bindingService.subscribe((newContext) => {
      setContext(newContext);
    });
    return () => unsubscribe();
  }, []);

  React.useEffect(() => {
    let active = true;
    const fetchAnnotation = async () => {
      if (!context || !context.isValid || !context.address || context.sheetName.startsWith("_")) {
        if (active) setAnnotation(null);
        return;
      }
      try {
        const stored = await loadAnnotationsFromStore();
        // Address from selection usually looks like "A1" or "A1:B2"
        // And stored anchor address should match or intersect.
        const current = stored.find(
          (a) => a.anchor.sheetName === context.sheetName && a.anchor.address === context.address
        );
        if (active) setAnnotation(current || null);
      } catch (e) {
        console.error("Failed to load annotation for inspector", e);
        if (active) setAnnotation(null);
      }
    };
    fetchAnnotation();
    return () => {
      active = false;
    };
  }, [context]);

  const handleStateChange = async (_ev: any, data: { optionValue?: string }) => {
    if (!annotation || !data.optionValue) return;
    setIsSaving(true);
    try {
      const updatedMeta = {
        ...annotation.metadata,
        lifecycleState: data.optionValue as LifecycleState,
      };
      const updatedAnnotation: Annotation = {
        ...annotation,
        metadata: updatedMeta,
      };
      
      await editAnnotation(
        annotation.anchor.sheetName,
        annotation.anchor.address,
        updatedAnnotation
      );
      
      setAnnotation(updatedAnnotation);
    } catch (e) {
      console.error("Failed to update lifecycle state", e);
    } finally {
      setIsSaving(false);
    }
  };

  if (!annotation) return null;

  const currentState = annotation.metadata?.lifecycleState || "draft";

  return (
    <Card className={styles.container}>
      <div className={styles.header}>
        <span>🔍</span> Annotation Inspector
      </div>
      <div className={styles.field}>
        <Label>Selected Type</Label>
        <Badge appearance="outline" color="brand">
          {annotation.type}
        </Badge>
      </div>
      <div className={styles.field}>
        <Label htmlFor="lifecycle-state">Lifecycle State</Label>
        <Dropdown
          id="lifecycle-state"
          value={currentState}
          selectedOptions={[currentState]}
          onOptionSelect={handleStateChange}
          size="small"
          disabled={isSaving}
        >
          <Option value="draft">draft</Option>
          <Option value="under_review">under_review</Option>
          <Option value="resolved">resolved</Option>
        </Dropdown>
      </div>
    </Card>
  );
};
