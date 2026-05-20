import * as React from "react";
import {
  Badge,
  Body1,
  Button,
  Card,
  Dropdown,
  Field,
  Input,
  MessageBar,
  MessageBarBody,
  Option,
  Text,
  Textarea,
  makeStyles,
  shorthands,
  tokens,
} from "@fluentui/react-components";
import {
  AdamDatasetClass,
  AdamDatasetMetadata,
  DatasetPurpose,
  SdtmDatasetClass,
  SdtmDatasetMetadata,
  SubmissionMetadata,
} from "../../core/types";
import {
  createAdamDatasetDrafts,
  createEmptyAdamDatasetMetadata,
  createEmptySdtmDatasetMetadata,
  createSdtmDatasetDrafts,
  DatasetDraft,
  validateAdamDatasetMetadata,
  validateSdtmDatasetMetadata,
} from "./submission-metadata-utils";

interface SubmissionMetadataViewProps {
  submissionMetadata?: SubmissionMetadata;
  isProcessing: boolean;
  onLoad: () => Promise<void>;
  onSave: (submissionMetadata: SubmissionMetadata) => void;
}

const useStyles = makeStyles({
  container: { display: "flex", flexDirection: "column", gap: "12px" },
  card: {
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusXLarge,
    padding: "20px",
    boxShadow: tokens.shadow4,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  header: { display: "flex", justifyContent: "space-between", gap: "8px", flexWrap: "wrap" },
  title: { fontSize: tokens.fontSizeBase300, fontWeight: tokens.fontWeightBold },
  subtitle: { color: tokens.colorNeutralForeground3 },
  scopeRow: { display: "flex", gap: "8px", flexWrap: "wrap" },
  activeScopeButton: {
    ...shorthands.borderColor(tokens.colorCompoundBrandStroke),
    fontWeight: tokens.fontWeightBold,
  },
  workspace: { display: "grid", gridTemplateColumns: "minmax(160px, 220px) 1fr", gap: "12px" },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    maxHeight: "360px",
    overflowY: "auto",
    paddingRight: "4px",
  },
  row: {
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: tokens.borderRadiusMedium,
    padding: "8px",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  selectedRow: { ...shorthands.borderColor(tokens.colorCompoundBrandStroke) },
  rowTitle: { fontWeight: tokens.fontWeightSemibold },
  rowMeta: { display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" },
  detail: {
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusLarge,
    padding: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    backgroundColor: tokens.colorNeutralBackground1,
  },
  fieldGrid: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "8px" },
  full: { gridColumn: "1 / -1" },
  actions: { display: "flex", gap: "8px", justifyContent: "space-between", flexWrap: "wrap" },
});

type Scope = "SDTM" | "ADaM";

function parseKeyVariables(input: string): string[] | undefined {
  const values = input
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  return values.length > 0 ? values : undefined;
}

export const SubmissionMetadataView: React.FC<SubmissionMetadataViewProps> = ({
  submissionMetadata,
  isProcessing,
  onLoad,
  onSave,
}) => {
  const styles = useStyles();
  const [scope, setScope] = React.useState<Scope>("SDTM");
  const [sdtmDrafts, setSdtmDrafts] = React.useState<DatasetDraft<SdtmDatasetMetadata>[]>([]);
  const [adamDrafts, setAdamDrafts] = React.useState<DatasetDraft<AdamDatasetMetadata>[]>([]);
  const [selectedSdtmId, setSelectedSdtmId] = React.useState<string | null>(null);
  const [selectedAdamId, setSelectedAdamId] = React.useState<string | null>(null);
  const [saveMessage, setSaveMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    const loadedSdtm = createSdtmDatasetDrafts(submissionMetadata?.sdtmDatasets);
    const loadedAdam = createAdamDatasetDrafts(submissionMetadata?.adamDatasets);
    setSdtmDrafts(loadedSdtm);
    setAdamDrafts(loadedAdam);
    setSelectedSdtmId(loadedSdtm[0]?.id || null);
    setSelectedAdamId(loadedAdam[0]?.id || null);
  }, [submissionMetadata]);

  const selectedSdtm = React.useMemo(
    () => sdtmDrafts.find((draft) => draft.id === selectedSdtmId) || null,
    [sdtmDrafts, selectedSdtmId]
  );
  const selectedAdam = React.useMemo(
    () => adamDrafts.find((draft) => draft.id === selectedAdamId) || null,
    [adamDrafts, selectedAdamId]
  );

  const fieldErrors = React.useMemo(() => {
    if (scope === "SDTM" && selectedSdtm) return validateSdtmDatasetMetadata(selectedSdtm.metadata);
    if (scope === "ADaM" && selectedAdam) return validateAdamDatasetMetadata(selectedAdam.metadata);
    return {};
  }, [scope, selectedSdtm, selectedAdam]);

  const addDataset = () => {
    setSaveMessage(null);
    if (scope === "SDTM") {
      const next: DatasetDraft<SdtmDatasetMetadata> = {
        id: `sdtm-new-${Date.now()}`,
        metadata: createEmptySdtmDatasetMetadata(),
        provenance: "Draft",
        readOnly: false,
      };
      setSdtmDrafts((current) => [...current, next]);
      setSelectedSdtmId(next.id);
      return;
    }
    const next: DatasetDraft<AdamDatasetMetadata> = {
      id: `adam-new-${Date.now()}`,
      metadata: createEmptyAdamDatasetMetadata(),
      provenance: "Draft",
      readOnly: false,
    };
    setAdamDrafts((current) => [...current, next]);
    setSelectedAdamId(next.id);
  };

  const unlockSelected = () => {
    if (scope === "SDTM" && selectedSdtm) {
      setSdtmDrafts((current) =>
        current.map((draft) => (draft.id === selectedSdtm.id ? { ...draft, readOnly: false } : draft))
      );
      return;
    }
    if (scope === "ADaM" && selectedAdam) {
      setAdamDrafts((current) =>
        current.map((draft) => (draft.id === selectedAdam.id ? { ...draft, readOnly: false } : draft))
      );
    }
  };

  const updateSdtm = (updater: (metadata: SdtmDatasetMetadata) => SdtmDatasetMetadata) => {
    if (!selectedSdtm || selectedSdtm.readOnly) return;
    setSdtmDrafts((current) =>
      current.map((draft) =>
        draft.id === selectedSdtm.id ? { ...draft, metadata: updater(draft.metadata) } : draft
      )
    );
  };

  const updateAdam = (updater: (metadata: AdamDatasetMetadata) => AdamDatasetMetadata) => {
    if (!selectedAdam || selectedAdam.readOnly) return;
    setAdamDrafts((current) =>
      current.map((draft) =>
        draft.id === selectedAdam.id ? { ...draft, metadata: updater(draft.metadata) } : draft
      )
    );
  };

  const saveDraft = () => {
    onSave({
      ...submissionMetadata,
      sdtmDatasets: sdtmDrafts.map((draft) => ({
        ...draft.metadata,
        domain: draft.metadata.domain.trim(),
        label: draft.metadata.label.trim(),
        structure: draft.metadata.structure.trim(),
        description: draft.metadata.description?.trim() || undefined,
        keyVariables: parseKeyVariables((draft.metadata.keyVariables || []).join(",")),
      })),
      adamDatasets: adamDrafts.map((draft) => ({
        ...draft.metadata,
        dataset: draft.metadata.dataset.trim(),
        label: draft.metadata.label.trim(),
        structure: draft.metadata.structure.trim(),
        description: draft.metadata.description?.trim() || undefined,
        keyVariables: parseKeyVariables((draft.metadata.keyVariables || []).join(",")),
      })),
    });
    setSaveMessage("Draft saved locally. Incomplete metadata is allowed until export/release validation.");
  };

  const hasSelection = scope === "SDTM" ? !!selectedSdtm : !!selectedAdam;
  const selectionReadOnly = scope === "SDTM" ? selectedSdtm?.readOnly : selectedAdam?.readOnly;
  const selectionImported = scope === "SDTM" ? selectedSdtm?.provenance === "Imported" : selectedAdam?.provenance === "Imported";

  return (
    <Card className={styles.card}>
      <div className={styles.header}>
        <div>
          <Body1 className={styles.title}>Submission Metadata</Body1>
          <Text className={styles.subtitle} block>
            Structured list + detail editing for SDTM and ADaM dataset metadata.
          </Text>
        </div>
        <Button appearance="outline" onClick={onLoad} disabled={isProcessing}>
          Refresh from Workbook
        </Button>
      </div>

      <MessageBar intent="info">
        <MessageBarBody>
          Edits are staged in local UI state. Use <strong>Save Draft</strong> to persist this session
          draft in app memory. Inline validation is advisory and does not block draft saves.
        </MessageBarBody>
      </MessageBar>

      <div className={styles.scopeRow}>
        <Button
          appearance={scope === "SDTM" ? "primary" : "outline"}
          className={scope === "SDTM" ? styles.activeScopeButton : undefined}
          onClick={() => setScope("SDTM")}
        >
          SDTM Datasets
        </Button>
        <Button
          appearance={scope === "ADaM" ? "primary" : "outline"}
          className={scope === "ADaM" ? styles.activeScopeButton : undefined}
          onClick={() => setScope("ADaM")}
        >
          ADaM Datasets
        </Button>
      </div>

      <div className={styles.workspace}>
        <div className={styles.list}>
          {(scope === "SDTM" ? sdtmDrafts : adamDrafts).map((draft) => {
            const title =
              scope === "SDTM"
                ? (draft as DatasetDraft<SdtmDatasetMetadata>).metadata.domain || "Unnamed SDTM Dataset"
                : (draft as DatasetDraft<AdamDatasetMetadata>).metadata.dataset || "Unnamed ADaM Dataset";
            const selected =
              scope === "SDTM" ? draft.id === selectedSdtmId : draft.id === selectedAdamId;
            return (
              <div
                key={draft.id}
                className={`${styles.row} ${selected ? styles.selectedRow : ""}`}
                onClick={() =>
                  scope === "SDTM" ? setSelectedSdtmId(draft.id) : setSelectedAdamId(draft.id)
                }
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    scope === "SDTM" ? setSelectedSdtmId(draft.id) : setSelectedAdamId(draft.id);
                  }
                }}
              >
                <Text className={styles.rowTitle} block>
                  {title}
                </Text>
                <div className={styles.rowMeta}>
                  <Badge appearance="tint" color={draft.provenance === "Imported" ? "informative" : "brand"}>
                    {draft.provenance}
                  </Badge>
                  {draft.readOnly && <Badge appearance="outline">Read-only</Badge>}
                </div>
              </div>
            );
          })}
          <Button appearance="outline" onClick={addDataset}>
            + Add {scope} Dataset
          </Button>
        </div>

        <div className={styles.detail}>
          {!hasSelection && (
            <Text block>Select a row to edit metadata details, or add a new dataset row.</Text>
          )}

          {hasSelection && selectionReadOnly && (
            <MessageBar intent="warning">
              <MessageBarBody>
                {selectionImported
                  ? "Imported metadata is shown as read-only for provenance."
                  : "This row is currently read-only."}
              </MessageBarBody>
            </MessageBar>
          )}

          {hasSelection && selectionReadOnly && (
            <Button appearance="outline" onClick={unlockSelected}>
              Unlock for Editing
            </Button>
          )}

          {scope === "SDTM" && selectedSdtm && (
            <div className={styles.fieldGrid}>
              <Field label="SDTM Domain" validationMessage={fieldErrors.domain}>
                <Input
                  value={selectedSdtm.metadata.domain}
                  onChange={(_, data) => updateSdtm((metadata) => ({ ...metadata, domain: data.value }))}
                />
              </Field>
              <Field label="Class">
                <Dropdown
                  value={selectedSdtm.metadata.class}
                  selectedOptions={[selectedSdtm.metadata.class]}
                  onOptionSelect={(_, data) =>
                    updateSdtm((metadata) => ({
                      ...metadata,
                      class: (data.optionValue as SdtmDatasetClass) || metadata.class,
                    }))
                  }
                >
                  {Object.values(SdtmDatasetClass).map((value) => (
                    <Option key={value} value={value}>
                      {value}
                    </Option>
                  ))}
                </Dropdown>
              </Field>
              <Field label="Label" validationMessage={fieldErrors.label} className={styles.full}>
                <Input
                  value={selectedSdtm.metadata.label}
                  onChange={(_, data) => updateSdtm((metadata) => ({ ...metadata, label: data.value }))}
                />
              </Field>
              <Field label="Structure" validationMessage={fieldErrors.structure} className={styles.full}>
                <Input
                  value={selectedSdtm.metadata.structure}
                  onChange={(_, data) =>
                    updateSdtm((metadata) => ({ ...metadata, structure: data.value }))
                  }
                />
              </Field>
              <Field label="Key Variables (comma separated)" className={styles.full}>
                <Input
                  value={(selectedSdtm.metadata.keyVariables || []).join(", ")}
                  onChange={(_, data) =>
                    updateSdtm((metadata) => ({
                      ...metadata,
                      keyVariables: parseKeyVariables(data.value),
                    }))
                  }
                />
              </Field>
              <Field label="Description" className={styles.full}>
                <Textarea
                  value={selectedSdtm.metadata.description || ""}
                  onChange={(_, data) =>
                    updateSdtm((metadata) => ({ ...metadata, description: data.value }))
                  }
                />
              </Field>
            </div>
          )}

          {scope === "ADaM" && selectedAdam && (
            <div className={styles.fieldGrid}>
              <Field label="ADaM Dataset" validationMessage={fieldErrors.dataset}>
                <Input
                  value={selectedAdam.metadata.dataset}
                  onChange={(_, data) => updateAdam((metadata) => ({ ...metadata, dataset: data.value }))}
                />
              </Field>
              <Field label="Class">
                <Dropdown
                  value={selectedAdam.metadata.class}
                  selectedOptions={[selectedAdam.metadata.class]}
                  onOptionSelect={(_, data) =>
                    updateAdam((metadata) => ({
                      ...metadata,
                      class: (data.optionValue as AdamDatasetClass) || metadata.class,
                    }))
                  }
                >
                  {Object.values(AdamDatasetClass).map((value) => (
                    <Option key={value} value={value}>
                      {value}
                    </Option>
                  ))}
                </Dropdown>
              </Field>
              <Field label="Label" validationMessage={fieldErrors.label} className={styles.full}>
                <Input
                  value={selectedAdam.metadata.label}
                  onChange={(_, data) => updateAdam((metadata) => ({ ...metadata, label: data.value }))}
                />
              </Field>
              <Field label="Structure" validationMessage={fieldErrors.structure} className={styles.full}>
                <Input
                  value={selectedAdam.metadata.structure}
                  onChange={(_, data) =>
                    updateAdam((metadata) => ({ ...metadata, structure: data.value }))
                  }
                />
              </Field>
              <Field label="Purpose">
                <Dropdown
                  value={selectedAdam.metadata.purpose || "Purpose"}
                  selectedOptions={selectedAdam.metadata.purpose ? [selectedAdam.metadata.purpose] : []}
                  onOptionSelect={(_, data) =>
                    updateAdam((metadata) => ({
                      ...metadata,
                      purpose: data.optionValue as DatasetPurpose,
                    }))
                  }
                >
                  <Option value={DatasetPurpose.TABULATION}>{DatasetPurpose.TABULATION}</Option>
                  <Option value={DatasetPurpose.ANALYSIS}>{DatasetPurpose.ANALYSIS}</Option>
                </Dropdown>
              </Field>
              <Field label="Key Variables (comma separated)">
                <Input
                  value={(selectedAdam.metadata.keyVariables || []).join(", ")}
                  onChange={(_, data) =>
                    updateAdam((metadata) => ({
                      ...metadata,
                      keyVariables: parseKeyVariables(data.value),
                    }))
                  }
                />
              </Field>
              <Field label="Description" className={styles.full}>
                <Textarea
                  value={selectedAdam.metadata.description || ""}
                  onChange={(_, data) =>
                    updateAdam((metadata) => ({ ...metadata, description: data.value }))
                  }
                />
              </Field>
            </div>
          )}
        </div>
      </div>

      <div className={styles.actions}>
        <Text className={styles.subtitle}>
          Draft incomplete metadata is allowed. Export/release gates enforce final completeness.
        </Text>
        <Button appearance="primary" onClick={saveDraft}>
          Save Draft
        </Button>
      </div>

      {saveMessage && (
        <MessageBar intent="success">
          <MessageBarBody>{saveMessage}</MessageBarBody>
        </MessageBar>
      )}
    </Card>
  );
};
