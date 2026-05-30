/**
 * @issue #46, #44
 */
import * as React from "react";
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Button,
  Input,
  Spinner,
  Badge,
  Text,
  makeStyles,
  tokens,
  Divider,
  DataGrid,
  DataGridBody,
  DataGridCell,
  DataGridHeader,
  DataGridHeaderCell,
  DataGridRow,
  createTableColumn,
  MessageBar,
  MessageBarBody,
  ProgressBar,
} from "@fluentui/react-components";
import { AddRegular, ArrowLeftRegular, ArrowDownloadRegular } from "@fluentui/react-icons";
import {
  fetchDictionaries,
  insertDictionaryToActiveCell,
  saveNewDictionary,
  CodelistGroup,
} from "../../core/services/dictionary-service";
import { createCdiscApiService, CdiscCtPackage, CdiscCtCodelist, CdiscCtTerm, CdiscApiFailure } from "../../core/services/cdisc-api-service";
import { filterDictionaries, getDictionaryPreview } from "./dictionary-sidecar-utils";
import { mapCdiscApiResponseToCrfCodelists, CdiscCtMappingFailure } from "../../core/services/cdisc-ct-mapping-service";
import {
  buildCtImportPlan,
  executeCtImport,
  readExistingCodelistRows,
  ConflictResolution,
  ImportConflictItem,
  ImportSummary,
  CtImportPlan,
} from "../../core/services/ct-import-service";

const useStyles = makeStyles({
  root: {
    position: "absolute",
    inset: 0,
    backgroundColor: tokens.colorNeutralBackground1,
    zIndex: 50,
    display: "flex",
    flexDirection: "column",
    boxShadow: tokens.shadow64,
  },
  header: {
    padding: "16px",
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexShrink: 0,
  },
  headerBadge: {
    marginBottom: "6px",
  },
  headerTitle: {
    fontSize: tokens.fontSizeBase500,
    fontWeight: tokens.fontWeightBold,
    color: tokens.colorNeutralForegroundOnBrand,
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  headerActions: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
  },
  body: {
    flexGrow: 1,
    padding: "16px",
    backgroundColor: tokens.colorNeutralBackground3,
    display: "flex",
    flexDirection: "column",
    overflowY: "auto",
    gap: "12px",
  },
  loadingState: {
    flexGrow: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
  },
  searchInput: {
    width: "100%",
  },
  resultsSummary: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "8px",
  },
  gridCard: {
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusMedium,
    padding: "8px",
    boxShadow: tokens.shadow2,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    overflowX: "auto",
  },
  dataGrid: {
    minWidth: "680px",
  },
  gridCellStack: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  dictId: {
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightBold,
    color: tokens.colorNeutralForeground1,
  },
  dictName: {
    fontSize: tokens.fontSizeBase100,
    color: tokens.colorNeutralForeground3,
  },
  tagRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "4px",
    alignItems: "center",
  },
  tag: {
    fontSize: tokens.fontSizeBase100,
    color: tokens.colorNeutralForeground3,
    backgroundColor: tokens.colorNeutralBackground3,
    borderRadius: tokens.borderRadiusSmall,
    padding: "2px 6px",
    border: `1px solid ${tokens.colorNeutralStroke1}`,
  },
  emptyText: {
    textAlign: "center",
    color: tokens.colorNeutralForeground3,
    padding: "24px 0",
  },
  actionCell: {
    display: "flex",
    justifyContent: "flex-end",
  },
  createForm: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  formCard: {
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusMedium,
    padding: "16px",
    boxShadow: tokens.shadow2,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  fieldLabel: {
    fontSize: tokens.fontSizeBase100,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground3,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    display: "block",
    marginBottom: "4px",
  },
  valueRow: {
    display: "flex",
    gap: "8px",
  },
  valueInput: {
    flexGrow: 1,
  },
  saveButton: {
    width: "100%",
  },
  // ── Import view ────────────────────────────────────────────────────────────
  importForm: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  importTextarea: {
    width: "100%",
    minHeight: "120px",
    fontFamily: "monospace",
    fontSize: tokens.fontSizeBase100,
    resize: "vertical",
    padding: "8px",
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground1,
  },
  progressCard: {
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusMedium,
    padding: "16px",
    boxShadow: tokens.shadow2,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  conflictCard: {
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusMedium,
    padding: "16px",
    boxShadow: tokens.shadow2,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  conflictItem: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    paddingBottom: "10px",
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  conflictActions: {
    display: "flex",
    gap: "6px",
    flexWrap: "wrap",
  },
  summaryCard: {
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusMedium,
    padding: "16px",
    boxShadow: tokens.shadow2,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  summaryRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryCount: {
    fontWeight: tokens.fontWeightBold,
  },
});

const cdiscApi = createCdiscApiService();

export const DictionarySidecar: React.FC = () => {
  const styles = useStyles();
  const [view, setView] = useState<"loading" | "browse" | "create" | "import">("loading");
  const [dictionaries, setDictionaries] = useState<CodelistGroup[]>([]);
  const [search, setSearch] = useState("");

  const [newId, setNewId] = useState("");
  const [newName, setNewName] = useState("");
  const [newItems, setNewItems] = useState([{ codedValue: "", decode: "" }]);

  // ── Import view state ──────────────────────────────────────────────────────
  const [importPackages, setImportPackages] = useState<CdiscCtPackage[]>([]);
  const [importPackagesLoading, setImportPackagesLoading] = useState(false);
  const [importPackageSearch, setImportPackageSearch] = useState("");
  const [selectedPackage, setSelectedPackage] = useState<CdiscCtPackage | null>(null);

  const [importParseError, setImportParseError] = useState<string | null>(null);
  const [importPlan, setImportPlan] = useState<CtImportPlan | null>(null);
  const [conflictResolutions, setConflictResolutions] = useState<
    Record<string, ConflictResolution>
  >({});
  const [importProgress, setImportProgress] = useState<{
    stage: string;
    completed: number;
    total: number;
  } | null>(null);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setView("loading");
    const data = await fetchDictionaries();
    setDictionaries(data);
    setView("browse");
  };

  const handleUseDictionary = useCallback(async (id: string) => {
    await insertDictionaryToActiveCell(id);
  }, []);

  const handleSaveNew = async () => {
    if (!newId || newItems.some((i) => !i.codedValue)) return;
    setView("loading");
    await saveNewDictionary(newId, newName, newItems);
    setNewId("");
    setNewName("");
    setNewItems([{ codedValue: "", decode: "" }]);
    await loadData();
  };

  // ── Import handlers ────────────────────────────────────────────────────────

  useEffect(() => {
    if (view === "import" && importPackages.length === 0) {
      const loadPackages = async () => {
        setImportPackagesLoading(true);
        const result = await cdiscApi.listCtPackages();
        if (result.ok) {
          setImportPackages(result.data);
        } else {
          const failure = result as CdiscApiFailure;
          setImportParseError(`Failed to load packages: ${failure.error.message}`);
        }
        setImportPackagesLoading(false);
      };
      loadPackages();
    }
  }, [view, importPackages.length]);

  const handleOpenImport = useCallback(() => {
    setImportPackageSearch("");
    setSelectedPackage(null);
    setImportParseError(null);
    setImportPlan(null);
    setConflictResolutions({});
    setImportProgress(null);
    setImportSummary(null);
    setImportError(null);
    setView("import");
  }, []);

  const handlePlanImport = useCallback(async () => {
    if (!selectedPackage) return;
    setImportParseError(null);
    setImportPlan(null);
    setImportSummary(null);
    setImportError(null);

    setImportProgress({ stage: "Fetching package codelists...", completed: 0, total: 1 });
    
    const codelistsResult = await cdiscApi.listPackageCodelists(selectedPackage.packageOid);
    if (!codelistsResult.ok) {
      const failure = codelistsResult as CdiscApiFailure;
      setImportParseError(`Failed to load codelists: ${failure.error.message}`);
      setImportProgress(null);
      return;
    }

    const codelists = codelistsResult.data;
    const termsByCodelistOid: Record<string, CdiscCtTerm[]> = {};
    
    setImportProgress({ stage: "Fetching terms...", completed: 0, total: codelists.length });
    
    // Fetch terms in batches to avoid overwhelming the network
    const BATCH_SIZE = 10;
    for (let i = 0; i < codelists.length; i += BATCH_SIZE) {
      const batch = codelists.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async (codelist) => {
          const termsResult = await cdiscApi.listCodelistTerms(codelist.codelistOid, selectedPackage.packageOid);
          if (termsResult.ok) {
            termsByCodelistOid[codelist.codelistOid] = termsResult.data;
          }
        })
      );
      setImportProgress({ stage: "Fetching terms...", completed: Math.min(i + BATCH_SIZE, codelists.length), total: codelists.length });
    }

    setImportProgress({ stage: "Validating & Planning...", completed: 1, total: 1 });

    const mappingInput = {
      package: selectedPackage,
      codelists,
      termsByCodelistOid,
    };

    const mappingResult = mapCdiscApiResponseToCrfCodelists(mappingInput);
    if (!mappingResult.ok) {
      const failure = mappingResult as CdiscCtMappingFailure;
      setImportParseError(
        `Mapping error (${failure.error.code}): ${failure.error.message}`
      );
      setImportProgress(null);
      return;
    }

    let existingRows;
    try {
      existingRows = await readExistingCodelistRows();
    } catch (err) {
      setImportParseError(err instanceof Error ? err.message : String(err));
      setImportProgress(null);
      return;
    }

    const plan = buildCtImportPlan(existingRows, mappingResult.rows);
    // Default: resolve all conflicts as "skip" (safe default)
    const defaultResolutions: Record<string, ConflictResolution> = {};
    plan.conflicts.forEach((c) => {
      defaultResolutions[c.codelistId] = "skip";
    });
    setConflictResolutions(defaultResolutions);
    setImportPlan(plan);
    setImportProgress(null);
  }, [selectedPackage]);

  const handleExecuteImport = useCallback(async () => {
    if (!importPlan) return;
    setImportError(null);
    setImportProgress({ stage: "Preparing…", completed: 0, total: 1 });

    let existingRows;
    try {
      existingRows = await readExistingCodelistRows();
    } catch (err) {
      setImportError(err instanceof Error ? err.message : String(err));
      setImportProgress(null);
      return;
    }

    const resolutionMap = new Map<string, ConflictResolution>(
      Object.entries(conflictResolutions) as [string, ConflictResolution][]
    );

    const summary = await executeCtImport(
      existingRows,
      importPlan,
      resolutionMap,
      (stage, completed, total) => {
        setImportProgress({ stage, completed, total });
      }
    );

    setImportProgress(null);
    setImportSummary(summary);

    if (summary.errors.length === 0) {
      // Reload the codelist library after a successful import
      await loadData();
    }
  }, [importPlan, conflictResolutions]);

  const handleConflictResolution = useCallback(
    (codelistId: string, resolution: ConflictResolution) => {
      setConflictResolutions((prev) => ({ ...prev, [codelistId]: resolution }));
    },
    []
  );

  const filteredDicts = useMemo(
    () => filterDictionaries(dictionaries, search),
    [dictionaries, search]
  );
  const hasSearch = search.trim().length > 0;
  const resultSummary = hasSearch
    ? `Showing ${filteredDicts.length} of ${dictionaries.length} codelists`
    : `${dictionaries.length} codelists available`;

  const columns = useMemo(
    () => [
      createTableColumn<CodelistGroup>({
        columnId: "id",
        compare: (a, b) => a.id.localeCompare(b.id),
        renderHeaderCell: () => "Codelist ID",
        renderCell: (item) => (
          <div className={styles.gridCellStack}>
            <Text className={styles.dictId} block>
              {item.id}
            </Text>
          </div>
        ),
      }),
      createTableColumn<CodelistGroup>({
        columnId: "name",
        compare: (a, b) => a.name.localeCompare(b.name),
        renderHeaderCell: () => "Display Name",
        renderCell: (item) => <Text className={styles.dictName}>{item.name || "—"}</Text>,
      }),
      createTableColumn<CodelistGroup>({
        columnId: "items",
        compare: (a, b) => a.items.length - b.items.length,
        renderHeaderCell: () => "Values",
        renderCell: (item) => <Text>{item.items.length}</Text>,
      }),
      createTableColumn<CodelistGroup>({
        columnId: "preview",
        renderHeaderCell: () => "Preview",
        renderCell: (item) => {
          const preview = getDictionaryPreview(item.items);

          return (
            <div className={styles.tagRow}>
              {preview.previewItems.map((entry) => (
                <span key={entry} className={styles.tag}>
                  {entry}
                </span>
              ))}
              {preview.overflowCount > 0 && (
                <span className={styles.tag}>+{preview.overflowCount} more</span>
              )}
            </div>
          );
        },
      }),
      createTableColumn<CodelistGroup>({
        columnId: "actions",
        renderHeaderCell: () => "Action",
        renderCell: (item) => (
          <div className={styles.actionCell}>
            <Button appearance="outline" size="small" onClick={() => handleUseDictionary(item.id)}>
              Use
            </Button>
          </div>
        ),
      }),
    ],
    [handleUseDictionary, styles]
  );

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <div>
          <div className={styles.headerBadge}>
            <Badge appearance="tint" color="success">
              Active Context
            </Badge>
          </div>
          <Text className={styles.headerTitle} block>
            <span>📚</span> Codelist Library
          </Text>
        </div>
        {view === "browse" && (
          <div className={styles.headerActions}>
            <Button
              appearance="secondary"
              size="small"
              icon={<ArrowDownloadRegular />}
              onClick={handleOpenImport}
            >
              Import CDISC CT
            </Button>
            <Button
              appearance="secondary"
              size="small"
              icon={<AddRegular />}
              onClick={() => setView("create")}
            >
              New
            </Button>
          </div>
        )}
      </div>

      <div className={styles.body}>
        {view === "loading" && (
          <div className={styles.loadingState}>
            <Spinner size="medium" label="Syncing Library..." />
          </div>
        )}

        {view === "browse" && (
          <>
            <Input
              className={styles.searchInput}
              placeholder="Search by ID, name, value, or decode..."
              value={search}
              onChange={(_, d) => setSearch(d.value)}
              aria-label="Search codelists"
            />
            <div className={styles.resultsSummary}>
              <Text>{resultSummary}</Text>
              {hasSearch && <Text>{`Search: "${search.trim()}"`}</Text>}
            </div>
            {filteredDicts.length > 0 ? (
              <div className={styles.gridCard}>
                <DataGrid
                  items={filteredDicts}
                  columns={columns}
                  sortable
                  getRowId={(item) => item.id}
                  className={styles.dataGrid}
                >
                  <DataGridHeader>
                    <DataGridRow>
                      {({ renderHeaderCell }) => (
                        <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>
                      )}
                    </DataGridRow>
                  </DataGridHeader>
                  <DataGridBody<CodelistGroup>>
                    {({ item, rowId }) => (
                      <DataGridRow<CodelistGroup> key={rowId}>
                        {({ renderCell }) => <DataGridCell>{renderCell(item)}</DataGridCell>}
                      </DataGridRow>
                    )}
                  </DataGridBody>
                </DataGrid>
              </div>
            ) : (
              <Text className={styles.emptyText}>
                {dictionaries.length === 0
                  ? "No codelists available yet."
                  : "No codelists found for the current search."}
              </Text>
            )}
          </>
        )}

        {view === "create" && (
          <div className={styles.createForm}>
            <Button
              appearance="subtle"
              size="small"
              icon={<ArrowLeftRegular />}
              onClick={() => setView("browse")}
            >
              Back to Browse
            </Button>

            <div className={styles.formCard}>
              <div>
                <label className={styles.fieldLabel}>Codelist ID</label>
                <Input
                  value={newId}
                  onChange={(_, d) => setNewId(d.value.toUpperCase())}
                  placeholder="e.g. SEV_DICT"
                  style={{ width: "100%", textTransform: "uppercase" }}
                />
              </div>
              <div>
                <label className={styles.fieldLabel}>Display Name</label>
                <Input
                  value={newName}
                  onChange={(_, d) => setNewName(d.value)}
                  placeholder="e.g. Severity Scale"
                  style={{ width: "100%" }}
                />
              </div>

              <Divider />

              <div>
                <label className={styles.fieldLabel}>Values &amp; Decodes</label>
                {newItems.map((item, idx) => (
                  <div key={idx} className={styles.valueRow} style={{ marginBottom: "8px" }}>
                    <Input
                      placeholder="Value (e.g. 1)"
                      value={item.codedValue}
                      onChange={(_, d) => {
                        const updated = [...newItems];
                        updated[idx].codedValue = d.value;
                        setNewItems(updated);
                      }}
                      style={{ width: "33%" }}
                    />
                    <Input
                      placeholder="Decode (e.g. Mild)"
                      value={item.decode}
                      onChange={(_, d) => {
                        const updated = [...newItems];
                        updated[idx].decode = d.value;
                        setNewItems(updated);
                      }}
                      className={styles.valueInput}
                    />
                  </div>
                ))}
                <Button
                  appearance="subtle"
                  size="small"
                  icon={<AddRegular />}
                  onClick={() => setNewItems([...newItems, { codedValue: "", decode: "" }])}
                >
                  Add Row
                </Button>
              </div>
            </div>

            <Button
              appearance="primary"
              className={styles.saveButton}
              onClick={handleSaveNew}
              disabled={!newId || newItems.length === 0 || !newItems[0].codedValue}
            >
              Save Dictionary
            </Button>
          </div>
        )}

        {/* ── Import CDISC CT view ────────────────────────────────────────────── */}
        {view === "import" && (
          <div className={styles.importForm}>
            <Button
              appearance="subtle"
              size="small"
              icon={<ArrowLeftRegular />}
              onClick={() => {
                setImportPlan(null);
                setImportSummary(null);
                setImportError(null);
                setView("browse");
              }}
            >
              Back to Browse
            </Button>

            {/* ── Step 1: Browse CDISC Packages ───────────────────────────────────────── */}
            {!importPlan && !importSummary && (
              <div className={styles.formCard}>
                <Text block style={{ fontWeight: tokens.fontWeightSemibold }}>
                  Import Controlled Terminology
                </Text>
                <Text block style={{ color: tokens.colorNeutralForeground3, fontSize: tokens.fontSizeBase100 }}>
                  Search and browse CDISC Controlled Terminology packages to import into your workbook.
                </Text>

                <Input
                  className={styles.searchInput}
                  placeholder="Search packages by ID or name..."
                  value={importPackageSearch}
                  onChange={(_, d) => setImportPackageSearch(d.value)}
                  aria-label="Search CDISC packages"
                />

                {importPackagesLoading ? (
                  <div className={styles.loadingState}>
                    <Spinner size="small" label="Loading packages from CDISC Library..." />
                  </div>
                ) : (
                  <div className={styles.gridCard} style={{ maxHeight: "300px", overflowY: "auto" }}>
                    {importPackages
                      .filter((pkg) => 
                        (pkg.title || pkg.packageOid).toLowerCase().includes(importPackageSearch.toLowerCase()) ||
                        pkg.packageOid.toLowerCase().includes(importPackageSearch.toLowerCase())
                      )
                      .map((pkg) => (
                        <div
                          key={pkg.packageOid}
                          style={{
                            padding: "8px",
                            cursor: "pointer",
                            borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
                            backgroundColor: selectedPackage?.packageOid === pkg.packageOid ? tokens.colorNeutralBackground1Selected : "transparent",
                          }}
                          onClick={() => setSelectedPackage(pkg)}
                        >
                          <Text block style={{ fontWeight: tokens.fontWeightSemibold }}>
                            {pkg.title || pkg.packageOid}
                          </Text>
                          <Text block style={{ fontSize: tokens.fontSizeBase100, color: tokens.colorNeutralForeground3 }}>
                            OID: {pkg.packageOid} {pkg.effectiveDate && `| Effective: ${pkg.effectiveDate}`}
                          </Text>
                        </div>
                      ))}
                    {importPackages.length > 0 && 
                      importPackages.filter((pkg) => 
                        (pkg.title || pkg.packageOid).toLowerCase().includes(importPackageSearch.toLowerCase()) ||
                        pkg.packageOid.toLowerCase().includes(importPackageSearch.toLowerCase())
                      ).length === 0 && (
                      <Text block style={{ padding: "8px", color: tokens.colorNeutralForeground3 }}>
                        No packages match your search.
                      </Text>
                    )}
                  </div>
                )}

                {importParseError && (
                  <MessageBar intent="error">
                    <MessageBarBody>{importParseError}</MessageBarBody>
                  </MessageBar>
                )}

                <Button
                  appearance="primary"
                  className={styles.saveButton}
                  onClick={handlePlanImport}
                  disabled={!selectedPackage || importProgress !== null}
                >
                  Preview &amp; Plan Import
                </Button>
              </div>
            )}

            {/* ── Step 2: Progress during planning ──────────────────────────── */}
            {importProgress && (
              <div className={styles.progressCard}>
                <Text block style={{ fontWeight: tokens.fontWeightSemibold }}>
                  {importProgress.stage}
                </Text>
                <ProgressBar
                  value={importProgress.total > 0 ? importProgress.completed / importProgress.total : undefined}
                />
                <Text style={{ fontSize: tokens.fontSizeBase100, color: tokens.colorNeutralForeground3 }}>
                  {importProgress.total > 0
                    ? `${importProgress.completed} / ${importProgress.total}`
                    : "Processing…"}
                </Text>
              </div>
            )}

            {/* ── Step 3: Conflict resolution ───────────────────────────────── */}
            {importPlan && !importProgress && !importSummary && (
              <>
                {/* Auto-action summary */}
                <div className={styles.formCard}>
                  <Text block style={{ fontWeight: tokens.fontWeightSemibold }}>
                    Import Plan
                  </Text>
                  <div className={styles.summaryRow}>
                    <Text>New codelists to insert</Text>
                    <Text className={styles.summaryCount}>{importPlan.autoInsertIds.size}</Text>
                  </div>
                  <div className={styles.summaryRow}>
                    <Text>Codelists with newer version (auto-overwrite)</Text>
                    <Text className={styles.summaryCount}>{importPlan.autoOverwriteIds.size}</Text>
                  </div>
                  <div className={styles.summaryRow}>
                    <Text>Identical codelists (auto-skip)</Text>
                    <Text className={styles.summaryCount}>{importPlan.skipIdenticalIds.size}</Text>
                  </div>
                  <div className={styles.summaryRow}>
                    <Text>Conflicts requiring resolution</Text>
                    <Text className={styles.summaryCount}>{importPlan.conflictIds.size}</Text>
                  </div>
                </div>

                {/* Conflict resolution UI */}
                {importPlan.conflicts.length > 0 && (
                  <div className={styles.conflictCard}>
                    <Text block style={{ fontWeight: tokens.fontWeightSemibold }}>
                      Resolve Conflicts
                    </Text>
                    <Text block style={{ color: tokens.colorNeutralForeground3, fontSize: tokens.fontSizeBase100 }}>
                      Each codelist below has a conflict with existing data. Choose how to handle it.
                    </Text>
                    {importPlan.conflicts.map((conflict: ImportConflictItem) => (
                      <div key={conflict.codelistId} className={styles.conflictItem}>
                        <Text block style={{ fontWeight: tokens.fontWeightSemibold }}>
                          {conflict.codelistId}
                          {conflict.codelistName && conflict.codelistName !== conflict.codelistId
                            ? ` — ${conflict.codelistName}`
                            : ""}
                        </Text>
                        <Text block style={{ fontSize: tokens.fontSizeBase100, color: tokens.colorNeutralForeground3 }}>
                          Existing: {conflict.existingTermCount} term(s) · Incoming: {conflict.incomingTermCount} term(s)
                        </Text>
                        <Text block style={{ fontSize: tokens.fontSizeBase100, color: tokens.colorNeutralForeground3 }}>
                          {conflict.message}
                        </Text>
                        <div className={styles.conflictActions}>
                          {(["skip", "overwrite", "append"] as ConflictResolution[]).map((resolution) => (
                            <Button
                              key={resolution}
                              size="small"
                              appearance={conflictResolutions[conflict.codelistId] === resolution ? "primary" : "outline"}
                              onClick={() => handleConflictResolution(conflict.codelistId, resolution)}
                            >
                              {resolution.charAt(0).toUpperCase() + resolution.slice(1)}
                            </Button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {importError && (
                  <MessageBar intent="error">
                    <MessageBarBody>{importError}</MessageBarBody>
                  </MessageBar>
                )}

                <Button
                  appearance="primary"
                  className={styles.saveButton}
                  onClick={handleExecuteImport}
                >
                  Execute Import
                </Button>
              </>
            )}

            {/* ── Step 4: Summary ───────────────────────────────────────────── */}
            {importSummary && !importProgress && (
              <div className={styles.summaryCard}>
                <Text block style={{ fontWeight: tokens.fontWeightSemibold }}>
                  {importSummary.errors.length > 0 ? "⚠ Import Failed" : "✅ Import Complete"}
                </Text>

                <div className={styles.summaryRow}>
                  <Text>Added</Text>
                  <Text className={styles.summaryCount}>{importSummary.added}</Text>
                </div>
                <div className={styles.summaryRow}>
                  <Text>Updated</Text>
                  <Text className={styles.summaryCount}>{importSummary.updated}</Text>
                </div>
                <div className={styles.summaryRow}>
                  <Text>Skipped</Text>
                  <Text className={styles.summaryCount}>{importSummary.skipped}</Text>
                </div>
                {importSummary.failed > 0 && (
                  <div className={styles.summaryRow}>
                    <Text>Failed</Text>
                    <Text className={styles.summaryCount}>{importSummary.failed}</Text>
                  </div>
                )}

                {importSummary.errors.map((err, i) => (
                  <MessageBar key={i} intent="error">
                    <MessageBarBody>{err}</MessageBarBody>
                  </MessageBar>
                ))}
                {importSummary.warnings.map((w, i) => (
                  <MessageBar key={i} intent="warning">
                    <MessageBarBody>{w}</MessageBarBody>
                  </MessageBar>
                ))}

                <Button
                  appearance="secondary"
                  className={styles.saveButton}
                  onClick={() => {
                    setImportPlan(null);
                    setImportSummary(null);
                    setView("browse");
                  }}
                >
                  Done
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
