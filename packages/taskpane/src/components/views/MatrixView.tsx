/**
 * @issue #28
 */
import * as React from "react";
import {
  Badge,
  Body1,
  Button,
  Card,
  DataGrid,
  DataGridBody,
  DataGridCell,
  DataGridHeader,
  DataGridHeaderCell,
  DataGridRow,
  Divider,
  Dropdown,
  Input,
  MessageBar,
  MessageBarBody,
  Option,
  Text,
  Tooltip,
  createTableColumn,
  makeStyles,
  shorthands,
  tokens,
} from "@fluentui/react-components";
import {
  ArrowRightRegular,
  SearchRegular,
  InfoRegular,
  WarningRegular,
  ErrorCircleRegular,
  CheckmarkCircleRegular,
} from "@fluentui/react-icons";
import { StudyDesign } from "@crf-xl/core/types/hierarchy";
import { StudyDiffReport } from "@crf-xl/core/types/diff";

import { useUnifiedList } from "../../hooks/useUnifiedList";
import {
  buildMatrixSearchIndex,
  filterMatrixSearchIndex,
  MatrixRequiredFilter,
  MatrixSearchEntry,
} from "./matrix-view-utils";
import { StudyDiffView } from "./StudyDiffView";

interface MatrixProps {
  onComplianceExport: () => Promise<void>;
  isProcessing: boolean;
  hasErrors: boolean;
  isLoaded: boolean;
  study: StudyDesign | null;
  baselineStudy?: StudyDesign | null;
  studyDiffReport?: StudyDiffReport | null;
  onNavigate?: (sheetName: string, rowIndex: number) => void;
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
    gap: "10px",
    marginBottom: "16px",
  },
  iconBox: {
    width: "32px",
    height: "32px",
    backgroundColor: tokens.colorBrandBackground2,
    borderRadius: tokens.borderRadiusMedium,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "16px",
  },
  cardTitle: {
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightBold,
    color: tokens.colorNeutralForeground1,
  },
  cardSubtitle: {
    fontSize: tokens.fontSizeBase100,
    color: tokens.colorNeutralForeground3,
  },
  exportButton: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "4px",
    height: "auto",
    padding: "12px 8px",
    width: "100%",
  },
  exportIcon: {
    fontSize: "20px",
    lineHeight: "1",
  },
  searchPanel: {
    marginTop: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  searchHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "8px",
    flexWrap: "wrap",
  },
  searchTitle: {
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
  },
  searchHint: {
    color: tokens.colorNeutralForeground3,
  },
  searchInput: {
    width: "100%",
  },
  filterGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: "8px",
  },
  filterControl: {
    minWidth: 0,
  },
  summaryRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "8px",
    flexWrap: "wrap",
  },
  summaryText: {
    color: tokens.colorNeutralForeground3,
  },
  resultList: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    maxHeight: "280px",
    overflowY: "auto",
    paddingRight: "4px",
  },
  resultItem: {
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: tokens.borderRadiusLarge,
    borderLeft: `4px solid ${tokens.colorBrandStroke1}`,
    padding: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  resultTopRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "8px",
    flexWrap: "wrap",
  },
  resultTitle: {
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
  },
  resultMeta: {
    color: tokens.colorNeutralForeground2,
  },
  badgeRow: {
    display: "flex",
    gap: "6px",
    flexWrap: "wrap",
  },
  previewText: {
    color: tokens.colorNeutralForeground2,
  },
  emptyState: {
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: tokens.borderRadiusLarge,
    border: `1px dashed ${tokens.colorNeutralStroke2}`,
    padding: "16px",
    textAlign: "center",
    color: tokens.colorNeutralForeground3,
  },
  depItemActive: {
    ...shorthands.borderColor(tokens.colorCompoundBrandStroke),
    backgroundColor: tokens.colorBrandBackground2,
    boxShadow: tokens.shadow2,
  },
  depItemError: {
    borderLeft: `4px solid ${tokens.colorStatusDangerBorder2}`,
  },
  depItemWarning: {
    borderLeft: `4px solid ${tokens.colorStatusWarningBorder2}`,
  },
  depItemOk: {
    borderLeft: `4px solid ${tokens.colorStatusSuccessBorder2}`,
  },
  depItemTitle: {
    fontWeight: tokens.fontWeightSemibold,
    fontSize: tokens.fontSizeBase200,
  },
  depItemRelation: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    flexWrap: "wrap",
    fontSize: tokens.fontSizeBase100,
    color: tokens.colorNeutralForeground2,
  },
  depItemExpression: {
    fontFamily: "monospace",
    fontSize: tokens.fontSizeBase100,
    backgroundColor: tokens.colorNeutralBackground3,
    padding: "2px 6px",
    borderRadius: tokens.borderRadiusSmall,
    wordBreak: "break-all",
  },
  detailPanel: {
    backgroundColor: tokens.colorNeutralBackground1,
    border: `1px solid ${tokens.colorCompoundBrandStroke}`,
    borderRadius: tokens.borderRadiusLarge,
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    marginTop: "8px",
    boxShadow: tokens.shadow4,
  },
  detailHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  detailTitle: {
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightBold,
  },
  detailMetaGrid: {
    display: "grid",
    gridTemplateColumns: "80px 1fr",
    rowGap: "6px",
    columnGap: "12px",
    fontSize: tokens.fontSizeBase100,
  },
  detailMetaLabel: {
    color: tokens.colorNeutralForeground3,
    fontWeight: tokens.fontWeightSemibold,
  },
  detailMetaVal: {
    color: tokens.colorNeutralForeground1,
  },
  detailActionRow: {
    display: "flex",
    gap: "8px",
    marginTop: "4px",
  },
});

const SEARCH_DEBOUNCE_MS = 150;

function MatrixEntryCard({ entry, styles }: { entry: MatrixSearchEntry; styles: any }) {
  const { items: previewItems, overflowCount } = useUnifiedList({
    data: entry.previewSource,
    mode: "capped",
    previewLimit: 3,
  });

  const previewText =
    previewItems.map((item) => `${item.itemOid} — ${item.itemLabel}`).join(" • ") +
    (overflowCount > 0 ? ` (+ ${overflowCount} more)` : "");

  return (
    <div className={styles.resultItem}>
      <div className={styles.resultTopRow}>
        <div>
          <Text className={styles.resultTitle} block>
            {entry.formName}
          </Text>
          <Text className={styles.resultMeta} block>{`${entry.formOid} · ${entry.eventName}`}</Text>
        </div>
        <Badge appearance="tint" color="brand">{`${entry.itemCount} vars`}</Badge>
      </div>
      <div className={styles.badgeRow}>
        <Badge appearance="outline" color="success">{`${entry.requiredCount} required`}</Badge>
        <Badge appearance="outline" color="warning">{`${entry.optionalCount} optional`}</Badge>
      </div>
      <Text className={styles.previewText}>{previewText}</Text>
    </div>
  );
}

export const MatrixView: React.FC<MatrixProps> = ({
  onComplianceExport,
  isProcessing,
  hasErrors,
  isLoaded,
  study,
  baselineStudy,
  studyDiffReport,
  onNavigate,
}) => {
  const styles = useStyles();
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [requiredFilter, setRequiredFilter] = React.useState<MatrixRequiredFilter>("all");
  const [dataTypeFilter, setDataTypeFilter] = React.useState("all");
  const [visitFilter, setVisitFilter] = React.useState("all");

  React.useEffect(() => {
    const timer = globalThis.setTimeout(() => setDebouncedSearch(search), SEARCH_DEBOUNCE_MS);
    return () => globalThis.clearTimeout(timer);
  }, [search]);

  const matrixIndex = React.useMemo(() => (study ? buildMatrixSearchIndex(study) : []), [study]);
  const filteredEntries = React.useMemo(
    () =>
      filterMatrixSearchIndex(matrixIndex, {
        search: debouncedSearch,
        required: requiredFilter,
        dataType: dataTypeFilter,
        visit: visitFilter,
      }),
    [matrixIndex, debouncedSearch, requiredFilter, dataTypeFilter, visitFilter]
  );
  const visitOptions = React.useMemo(
    () =>
      Array.from(new Map(matrixIndex.map((entry) => [entry.eventOid, entry.eventName])).entries()),
    [matrixIndex]
  );
  const dataTypeOptions = React.useMemo(
    () =>
      Array.from(new Set(matrixIndex.flatMap((entry) => entry.dataTypes))).sort((left, right) =>
        left.localeCompare(right)
      ),
    [matrixIndex]
  );
  const hasActiveFilters =
    search.trim().length > 0 ||
    requiredFilter !== "all" ||
    dataTypeFilter !== "all" ||
    visitFilter !== "all";

  const clearFilters = React.useCallback(() => {
    setSearch("");
    setDebouncedSearch("");
    setRequiredFilter("all");
    setDataTypeFilter("all");
    setVisitFilter("all");
  }, []);

  const hasDeps = study?.crossFormDependencies && study.crossFormDependencies.length > 0;
  const [selectedDepId, setSelectedDepId] = React.useState<string | null>(null);

  const selectedDep = React.useMemo(() => {
    return study?.crossFormDependencies?.find((d: any) => d.id === selectedDepId) || null;
  }, [study?.crossFormDependencies, selectedDepId]);

  const columns = React.useMemo(
    () => [
      createTableColumn<any>({
        columnId: "sourceForm",
        compare: (a, b) => (a.sourceFormOid || "").localeCompare(b.sourceFormOid || ""),
        renderHeaderCell: () => "Source Form",
        renderCell: (item) => <Text weight="semibold">{item.sourceFormOid || "Unknown"}</Text>,
      }),
      createTableColumn<any>({
        columnId: "source",
        renderHeaderCell: () => "Source",
        renderCell: (item) => (
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <div className={styles.depItemTitle}>{item.sourceOid}</div>
            <div className={styles.badgeRow}>
              <Badge appearance="tint" color="brand">
                {item.dependencyType}
              </Badge>
              {item.status !== "Valid" && (
                <Badge appearance="filled" color={item.severity === "Error" ? "danger" : "warning"}>
                  {item.status}
                </Badge>
              )}
            </div>
          </div>
        ),
      }),
      createTableColumn<any>({
        columnId: "target",
        renderHeaderCell: () => "Target",
        renderCell: (item) => (
          <div className={styles.depItemRelation}>
            <span>{item.sourceType}</span>
            <ArrowRightRegular style={{ fontSize: "12px" }} aria-label="targets" />
            <span>
              {item.targetFormOid !== "Unknown"
                ? `${item.targetFormOid}.${item.targetOid}`
                : item.targetOid}
            </span>
            <span style={{ fontSize: "11px", opacity: 0.7 }}>({item.targetType})</span>
          </div>
        ),
      }),
      createTableColumn<any>({
        columnId: "expression",
        renderHeaderCell: () => "Expression",
        renderCell: (item) => <div className={styles.depItemExpression}>{item.expression}</div>,
      }),
    ],
    [styles]
  );

  return (
    <div className={styles.container} id="tour-matrix">
      <Card className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.iconBox}>📅</div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Body1 className={styles.cardTitle}>Visit Matrix</Body1>
            <Tooltip
              content="The schedule of events (SoE) mapping forms to visits/timepoints."
              relationship="label"
            >
              <InfoRegular
                style={{ fontSize: "14px", cursor: "help", color: tokens.colorNeutralForeground3 }}
              />
            </Tooltip>
          </div>
          <div>
            <Body1 className={styles.cardSubtitle}>Schedule &amp; Export</Body1>
            {baselineStudy && (
              <Body1 className={styles.cardSubtitle}>
                Baseline ready: {baselineStudy.metadata.protocolId} (
                {Object.keys(baselineStudy.forms).length} forms)
              </Body1>
            )}
          </div>
        </div>

        <Divider />

        <Button
          appearance="primary"
          className={styles.exportButton}
          onClick={onComplianceExport}
          disabled={isProcessing || hasErrors || !isLoaded}
        >
          <span className={styles.exportIcon}>📦</span>
          <span>Compliance Export</span>
        </Button>

        {hasErrors && (
          <MessageBar intent="error" style={{ marginTop: "12px" }}>
            <MessageBarBody>
              Critical errors detected. Resolve highlighted issues in Excel to unlock export.
            </MessageBarBody>
          </MessageBar>
        )}

        <div className={styles.searchPanel}>
          <div className={styles.searchHeader}>
            <div>
              <Text className={styles.searchTitle} block>
                Quick Search
              </Text>
              <Text className={styles.searchHint} block>
                Search form OID, form name, visit, variable OID, or variable label.
              </Text>
            </div>
            {hasActiveFilters && (
              <Button appearance="subtle" size="small" onClick={clearFilters}>
                Clear search
              </Button>
            )}
          </div>

          {study ? (
            <>
              <Input
                className={styles.searchInput}
                placeholder="Search matrix assignments..."
                value={search}
                onChange={(_, data) => setSearch(data.value)}
                aria-label="Quick search matrix"
              />
              <div className={styles.filterGrid}>
                <Dropdown
                  className={styles.filterControl}
                  value={
                    requiredFilter === "all"
                      ? "Required / optional"
                      : requiredFilter === "required"
                        ? "Required only"
                        : "Optional only"
                  }
                  selectedOptions={[requiredFilter]}
                  onOptionSelect={(_, data) =>
                    setRequiredFilter((data.optionValue as MatrixRequiredFilter) || "all")
                  }
                >
                  <Option value="all">Required / optional</Option>
                  <Option value="required">Required only</Option>
                  <Option value="optional">Optional only</Option>
                </Dropdown>
                <Dropdown
                  className={styles.filterControl}
                  value={dataTypeFilter === "all" ? "Data type" : dataTypeFilter}
                  selectedOptions={[dataTypeFilter]}
                  onOptionSelect={(_, data) => setDataTypeFilter(data.optionValue || "all")}
                >
                  <Option value="all">Data type</Option>
                  {dataTypeOptions.map((dataType) => (
                    <Option key={dataType} value={dataType}>
                      {dataType}
                    </Option>
                  ))}
                </Dropdown>
                <Dropdown
                  className={styles.filterControl}
                  value={
                    visitFilter === "all"
                      ? "Visit assignment"
                      : visitOptions.find(([eventOid]) => eventOid === visitFilter)?.[1] ||
                        "Visit assignment"
                  }
                  selectedOptions={[visitFilter]}
                  onOptionSelect={(_, data) => setVisitFilter(data.optionValue || "all")}
                >
                  <Option value="all">Visit assignment</Option>
                  {visitOptions.map(([eventOid, eventName]) => (
                    <Option key={eventOid} value={eventOid}>
                      {eventName}
                    </Option>
                  ))}
                </Dropdown>
              </div>
              <div className={styles.summaryRow}>
                <Text className={styles.summaryText}>
                  {hasActiveFilters
                    ? `Showing ${filteredEntries.length} of ${matrixIndex.length} matrix assignments`
                    : `${matrixIndex.length} matrix assignments indexed`}
                </Text>
                {search.trim().length > 0 && (
                  <Text className={styles.summaryText}>{`Search: "${search.trim()}"`}</Text>
                )}
              </div>
              {filteredEntries.length > 0 ? (
                <div className={styles.resultList}>
                  {filteredEntries.map((entry) => (
                    <MatrixEntryCard key={entry.id} entry={entry} styles={styles} />
                  ))}
                </div>
              ) : (
                <div className={styles.emptyState}>
                  <Text block>No matrix assignments match the current search and filters.</Text>
                  <Text block>
                    Clear the search or adjust the filters to restore the full matrix.
                  </Text>
                </div>
              )}
            </>
          ) : (
            <MessageBar>
              <MessageBarBody>
                Run “Validate Entire Study” to load the latest matrix into memory for quick search.
              </MessageBarBody>
            </MessageBar>
          )}
        </div>
      </Card>

      {hasDeps && (
        <Card className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.iconBox}>🔗</div>
            <div style={{ flexGrow: 1 }}>
              <Body1 id="cross-form-dependency-title" className={styles.cardTitle}>
                Cross-Form Dependency Map
              </Body1>
              <Body1 className={styles.cardSubtitle}>
                Traces rule-linked variables across forms
              </Body1>
            </div>
            <div className={styles.badgeRow}>
              {study.crossFormDependencies!.filter((d) => d.severity === "Error").length > 0 && (
                <Badge color="danger" appearance="tint">
                  {study.crossFormDependencies!.filter((d) => d.severity === "Error").length} Errors
                </Badge>
              )}
              {study.crossFormDependencies!.filter((d) => d.severity === "Warning").length > 0 && (
                <Badge color="warning" appearance="tint">
                  {study.crossFormDependencies!.filter((d) => d.severity === "Warning").length}{" "}
                  Warnings
                </Badge>
              )}
            </div>
          </div>

          <Divider />

          <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "12px" }}>
            <DataGrid
              aria-labelledby="cross-form-dependency-title"
              items={study.crossFormDependencies || []}
              columns={columns}
              focusMode="cell"
              selectionMode="single"
              getRowId={(item) => item.id}
              selectedItems={selectedDepId ? new Set([selectedDepId]) : new Set()}
              onSelectionChange={(_, data) => {
                const arr = Array.from(data.selectedItems);
                setSelectedDepId(arr.length > 0 ? (arr[0] as string) : null);
              }}
            >
              <DataGridHeader>
                <DataGridRow>
                  {({ renderHeaderCell }) => (
                    <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>
                  )}
                </DataGridRow>
              </DataGridHeader>
              <DataGridBody<any>>
                {({ item, rowId }) => {
                  const isSelected = selectedDepId === item.id;
                  const severityClass =
                    item.severity === "Error"
                      ? styles.depItemError
                      : item.severity === "Warning"
                        ? styles.depItemWarning
                        : styles.depItemOk;

                  return (
                    <DataGridRow<any>
                      key={rowId}
                      className={`${severityClass} ${isSelected ? styles.depItemActive : ""}`}
                    >
                      {({ renderCell }) => <DataGridCell>{renderCell(item)}</DataGridCell>}
                    </DataGridRow>
                  );
                }}
              </DataGridBody>
            </DataGrid>

            {selectedDep && (
              <div className={styles.detailPanel}>
                <div className={styles.detailHeader}>
                  <Text className={styles.detailTitle} block>
                    Dependency Details
                  </Text>
                  {selectedDep.severity === "Error" ? (
                    <Badge color="danger" icon={<ErrorCircleRegular />}>
                      Error
                    </Badge>
                  ) : selectedDep.severity === "Warning" ? (
                    <Badge color="warning" icon={<WarningRegular />}>
                      Warning
                    </Badge>
                  ) : (
                    <Badge color="success" icon={<CheckmarkCircleRegular />}>
                      Valid
                    </Badge>
                  )}
                </div>

                <Divider />

                <div className={styles.detailMetaGrid}>
                  <span className={styles.detailMetaLabel}>Status:</span>
                  <span className={styles.detailMetaVal}>{selectedDep.status}</span>

                  <span className={styles.detailMetaLabel}>Expression:</span>
                  <code style={{ fontFamily: "monospace", wordBreak: "break-all" }}>
                    {selectedDep.expression}
                  </code>

                  <span className={styles.detailMetaLabel}>Description:</span>
                  <span className={styles.detailMetaVal}>{selectedDep.message}</span>
                </div>

                <div className={styles.detailActionRow}>
                  {onNavigate && selectedDep.sourceRowIndex !== undefined && (
                    <Button
                      size="small"
                      appearance="primary"
                      icon={<SearchRegular />}
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigate(selectedDep.sourceFormOid, selectedDep.sourceRowIndex);
                      }}
                    >
                      Go to Source ({selectedDep.sourceFormOid} row {selectedDep.sourceRowIndex + 1}
                      )
                    </Button>
                  )}

                  {onNavigate &&
                    selectedDep.targetRowIndex !== undefined &&
                    selectedDep.targetFormOid !== "Unknown" && (
                      <Button
                        size="small"
                        appearance="secondary"
                        icon={<SearchRegular />}
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigate(selectedDep.targetFormOid, selectedDep.targetRowIndex);
                        }}
                      >
                        Go to Target ({selectedDep.targetFormOid} row{" "}
                        {selectedDep.targetRowIndex + 1})
                      </Button>
                    )}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}
      <StudyDiffView report={studyDiffReport ?? null} />
    </div>
  );
};
