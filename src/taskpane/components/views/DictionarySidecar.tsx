/**
 * @issue #83
 * @issue #159
 * @issue #174
 * @issue #165
 * @issue #176
 * @issue #46
 * @issue #44
 */
import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import {
  Button,
  Card,
  Input,
  Spinner,
  Badge,
  Text,
  makeStyles,
  tokens,
  Divider,
  MessageBar,
  MessageBarBody,
  ProgressBar,
  TabList,
  Tab,
  Tooltip,
  mergeClasses,
  OverlayDrawer,
} from "@fluentui/react-components";
import { UniversalWizard } from "../ui/UniversalStepper";

import {
  AddRegular,
  ArrowLeftRegular,
  ArrowDownloadRegular,
  InfoRegular,
} from "@fluentui/react-icons";
import { fetchDictionaries, saveDictionary, CodelistGroup, CodelistItem } from "../../core";
import { TerminologySearchResult } from "../../core";
import { TerminologySearchService } from "../../core";
import { bindingService, SelectionContext } from "../../core";
import { highlightLocaleColumns } from "../../core";
import { LinguisticService } from "../../core";
import { createCdiscApiService, CdiscCtPackage, CdiscCtTerm, CdiscApiFailure } from "../../core";
import { getDictionaryPreview } from "./dictionary-sidecar-utils";
import { mapCdiscApiResponseToCrfCodelists, CdiscCtMappingFailure } from "../../core";
import { announcer } from "../../core/services/announcer";
import {
  buildCtImportPlan,
  executeCtImport,
  readExistingCodelistRows,
  ConflictResolution,
  ImportSummary,
  CtImportPlan,
  Diagnostic,
  createOfficeDiagnostic,
} from "../../core";

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
  },
  header: {
    padding: "12px 16px",
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
    display: "flex",
    flexDirection: "column",
    flexShrink: 0,
    gap: "4px",
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
  body: {
    flexGrow: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    position: "relative",
  },
  zone1: {
    flexShrink: 0,
  },
  zone2: {
    padding: "12px 16px",
    backgroundColor: tokens.colorNeutralBackground1,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    flexShrink: 0,
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  zone3: {
    flexGrow: 1,
    overflowY: "auto",
    padding: "12px 16px",
    backgroundColor: tokens.colorNeutralBackground3,
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  zone4: {
    flexGrow: 1,
    overflowY: "auto",
    padding: "16px",
    backgroundColor: tokens.colorNeutralBackground1,
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  zone5: {
    padding: "12px 16px",
    backgroundColor: tokens.colorNeutralBackground1,
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    flexShrink: 0,
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  loadingState: {
    flexGrow: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    padding: "20px",
    textAlign: "center",
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
  flexSpaceBetweenStart: {
    display: "flex", justifyContent: "space-between", alignItems: "flex-start",
  },
  flexSpaceBetweenCenter: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
  },
  marginTop8: {
    marginTop: "8px",
  },
  marginTop16: {
    marginTop: "16px",
  },
  marginTop24: {
    marginTop: "24px",
  },
  marginBottom4: {
    marginBottom: "4px",
  },
  marginBottom8: {
    marginBottom: "8px",
  },
  marginBottom12: {
    marginBottom: "12px",
  },
  marginBottom0: {
    marginBottom: 0,
  },
  marginLeftAuto: {
    marginLeft: "auto",
  },
  flexColumnGap4: {
    display: "flex", flexDirection: "column", gap: "4px",
  },
  flexColumnGap8: {
    display: "flex", flexDirection: "column", gap: "8px",
  },
  flexColumnGap12: {
    display: "flex", flexDirection: "column", gap: "12px",
  },
  flexRowGap8: {
    display: "flex", gap: "8px",
  },
  flexRowGap8Center: {
    display: "flex", gap: "8px", alignItems: "center",
  },
  flexRowGap4Center: {
    display: "flex", alignItems: "center", gap: "4px", marginBottom: "4px",
  },
  flexRowGap6Center: {
    display: "flex", alignItems: "center", gap: "6px",
  },
  flexRowGap8CenterMarginBottom8: {
    display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px",
  },
  flexColumn: {
    display: "flex", flexDirection: "column",
  },
  width100: {
    width: "100%",
  },
  width100Upper: {
    width: "100%", textTransform: "uppercase",
  },
  width80: {
    width: "80px",
  },
  flexGrow1: {
    flexGrow: 1,
  },
  textColorNeutral3: {
    color: tokens.colorNeutralForeground3,
  },
  textColorMarigold: {
    color: tokens.colorPaletteMarigoldForeground1,
  },
  fontWeightSemibold: {
    fontWeight: tokens.fontWeightSemibold,
  },
  fontSizeBase300: {
    fontSize: tokens.fontSizeBase300,
  },
  fontSizeBase100Margin0: {
    fontSize: tokens.fontSizeBase100, marginBottom: 0,
  },
  fontSize48Margin12: {
    fontSize: "48px", marginBottom: "12px",
  },
  fontSize32Margin8: {
    fontSize: "32px", marginBottom: "8px",
  },
  padding12Op80: {
    padding: "12px", opacity: 0.8,
  },
  padding12Cursor: {
    padding: "12px", cursor: "pointer",
  },
  padding80: {
    padding: "8px 0",
  },
  minWidth30Center: {
    minWidth: "30px", justifyContent: "center",
  },
  maxHeight300Auto: {
    maxHeight: "300px", overflowY: "auto",
  },
  cursorPointerTransition: {
    cursor: "pointer", transition: "background-color 0.2s",
  },
  cursorPointerTransitionOp60: {
    cursor: "pointer", transition: "background-color 0.2s", opacity: 0.6,
  },
  helpTooltipIcon: {
    display: "inline-flex", alignItems: "center", justifyContent: "center", width: "16px", height: "16px", borderRadius: "50%", backgroundColor: tokens.colorNeutralBackground3, color: tokens.colorNeutralForeground3, fontSize: "10px", cursor: "help",
  },
  dictHeaderBorder: {
    padding: "12px", borderBottom: `1px solid ${tokens.colorNeutralStroke2}`, display: "flex", flexDirection: "column", gap: "8px",
  },
  borderBottomFlexSpaceBetween: {
    display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${tokens.colorNeutralStroke1}`, paddingBottom: "8px", marginBottom: "8px",
  },
  borderBottomFlexSpaceBetween2: {
    display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${tokens.colorNeutralStroke2}`, paddingBottom: "8px",
  },
  bgNeutral3Rounded8: {
    padding: "8px", backgroundColor: tokens.colorNeutralBackground3, borderRadius: tokens.borderRadiusMedium,
  },
  bgNeutral2BorderRounded16: {
    padding: "16px", backgroundColor: tokens.colorNeutralBackground2, borderRadius: tokens.borderRadiusMedium, border: `1px solid ${tokens.colorNeutralStroke1}`,
  },
  bgRedBorderRounded12: {
    padding: "12px", border: `1px solid ${tokens.colorPaletteRedBorder2}`, borderRadius: tokens.borderRadiusMedium, backgroundColor: tokens.colorPaletteRedBackground2,
  },
  emptyStateContainer: {
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", padding: "24px", textAlign: "center", color: tokens.colorNeutralForeground3,
  },
  marginTop4: { marginTop: "4px" },
  headerBtn: {
    color: tokens.colorNeutralForegroundOnBrand, borderColor: tokens.colorNeutralForegroundOnBrand,
  },
  flexGrowColumnGap8: {
    flexGrow: 1, display: "flex", flexDirection: "column", gap: "8px", overflow: "hidden",
  },
  flexGrowColumnGap8Auto: {
    flexGrow: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px",
  },
  flexColumnGap8Padding10: {
    display: "flex", flexDirection: "column", gap: "8px", padding: "10px",
  },
  flexRowGap12CenterPadding10: {
    display: "flex", gap: "12px", alignItems: "center", padding: "10px",
  },
  textColorNeutral3Margin4_16: {
    color: tokens.colorNeutralForeground3, marginTop: "4px", marginBottom: "16px",
  },
  helpIcon12: {
    fontSize: "12px", cursor: "help", color: tokens.colorNeutralForeground3,
  },
  helpIcon10: {
    fontSize: "10px", cursor: "help", color: tokens.colorNeutralForeground3,
  },
  gridLanguages: {
    display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
  },
  gridLanguagesSingle: {
    display: "grid", gridTemplateColumns: "1fr",
  },
  textColorNeutral3FontSize100: {
    color: tokens.colorNeutralForeground3, fontSize: tokens.fontSizeBase100,
  },
  activeResultBorder: {
    border: `2px solid ${tokens.colorBrandStroke1}`,
  },
  inactiveResultBorder: {
    border: `1px solid ${tokens.colorNeutralStroke1}`,
  },
  borderBottomSolid: {
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  borderBottomNone: {
    borderBottom: "none",
  },
  padding12Cursor: {
    cursor: "pointer", padding: "12px",
  },
  packageItem: {
    padding: "8px", cursor: "pointer", borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
  },
  packageItemActive: {
    backgroundColor: tokens.colorNeutralBackground1Selected,
  },
  packageItemInactive: {
    backgroundColor: "transparent",
  },
  marginBottom16: {
    marginBottom: "16px",
  },
  flexSpaceBetweenStart: {
    display: "flex", justifyContent: "space-between", alignItems: "flex-start",
  },
  summaryCount: {
    fontWeight: tokens.fontWeightBold,
  },
});

const cdiscApi = createCdiscApiService();

interface DictionarySidecarProps {
  selectedLanguage?: string;
  defaultLanguage?: string;
  supportedLanguages?: string[];
}

export const DictionarySidecar: React.FC<DictionarySidecarProps> = ({
  selectedLanguage: initialLanguage = "en-US",
  defaultLanguage = "en-US",
  supportedLanguages = ["en-US"],
}) => {
  const styles = useStyles();
  const [view, setView] = useState<
    "loading" | "browse" | "create" | "import" | "detail" | "searching" | "error" | "no-selection"
  >("loading");
  const [localLanguage, setLocalLanguage] = useState(initialLanguage);
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    setLocalLanguage(initialLanguage);
  }, [initialLanguage]);
  const [dictionaries, setDictionaries] = useState<CodelistGroup[]>([]);
  const [search, setSearch] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<TerminologySearchResult[]>([]);
  const [standardResults, setStandardResults] = useState<TerminologySearchResult[]>([]);
  const [selectedCodelist, setSelectedCodelist] = useState<CodelistGroup | null>(null);
  const [selection, setSelection] = useState<SelectionContext | null>(
    bindingService.getCurrentContext()
  );

  const [newId, setNewId] = useState("");
  const [newName, setNewName] = useState("");
  const [newItems, setNewItems] = useState([
    { codedValue: "", decodedText: { [defaultLanguage]: "" } },
  ]);

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

  const [globalError, setGlobalError] = useState<Diagnostic | null>(null);
  const [lastActionStatus, setLastActionStatus] = useState<{
    type: "applied" | "saved" | "imported";
    message: string;
  } | null>(null);
  const [manualOverride, setManualOverride] = useState(false);

  useEffect(() => {
    loadData();
    highlightLocaleColumns().catch(console.error);

    const unsubscribe = bindingService.subscribe((context) => {
      setSelection(context);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (
      !manualOverride &&
      selection &&
      !selection.isValid &&
      ["browse", "searching", "detail"].includes(view)
    ) {
      setView("no-selection");
    } else if (selection?.isValid && view === "no-selection") {
      setView(search.trim() ? "searching" : "browse");
      setManualOverride(false);
    }

    if (selection?.isValid) {
      setIsOpen(true);
    }
  }, [selection, view, search, manualOverride]);

  const loadData = async () => {
    try {
      setView("loading");
      setGlobalError(null);
      const data = await fetchDictionaries();
      setDictionaries(data);
      setView("browse");
    } catch (error) {
      const diagnostic = createOfficeDiagnostic(error);
      setGlobalError(diagnostic);
      setView("error");
    }
  };

  const handleUseDictionary = useCallback(async (id: string) => {
    try {
      await bindingService.performInternalOperation(async (context) => {
        const range = context.workbook.getSelectedRange();
        range.values = [[id]];
        await context.sync();
      });
      setLastActionStatus({ type: "applied", message: `Applied '${id}' to cell.` });
      setTimeout(() => setLastActionStatus(null), 3000);
    } catch (error) {
      const diagnostic = createOfficeDiagnostic(error);
      setGlobalError(diagnostic);
    }
  }, []);

  const handleSaveNew = async () => {
    if (!newId || newItems.some((i) => !i.codedValue)) return;
    try {
      setView("loading");
      await saveDictionary(newId, newName, newItems, true);
      setNewId("");
      setNewName("");
      setNewItems([{ codedValue: "", decodedText: { [defaultLanguage]: "" } }]);
      setLastActionStatus({ type: "saved", message: `Codelist '${newId}' saved.` });
      setTimeout(() => setLastActionStatus(null), 3000);
      await loadData();
    } catch (error) {
      const diagnostic = createOfficeDiagnostic(error);
      setGlobalError(diagnostic);
      setView("error");
    }
  };

  const [isEditing, setIsEditing] = useState(false);
  const [editItems, setEditItems] = useState<CodelistItem[]>([]);

  const handleSelectCodelist = React.useCallback(
    async (codelistId: string) => {
      setIsEditing(false);
      setEditItems([]);
      try {
        setView("loading");
        const data = await fetchDictionaries();
        setDictionaries(data);
        const updated = data.find((d) => d.id === codelistId);
        if (updated) {
          setSelectedCodelist(updated);
          setView("detail");
        } else {
          setView(search.trim() ? "searching" : "browse");
        }
      } catch (error) {
        const diagnostic = createOfficeDiagnostic(error);
        setGlobalError(diagnostic);
        setView("error");
      }
    },
    [search]
  );

  const handleStartEdit = () => {
    if (!selectedCodelist) return;
    setEditItems(JSON.parse(JSON.stringify(selectedCodelist.items)));
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedCodelist || editItems.some((i) => !i.codedValue)) return;
    try {
      setView("loading");
      await saveDictionary(selectedCodelist.id, selectedCodelist.name, editItems, false);
      setIsEditing(false);
      setLastActionStatus({ type: "saved", message: `Changes to '${selectedCodelist.id}' saved.` });
      setTimeout(() => setLastActionStatus(null), 3000);
      await loadData();
      // Re-select updated codelist
      const data = await fetchDictionaries();
      const updated = data.find((d) => d.id === selectedCodelist.id);
      if (updated) setSelectedCodelist(updated);
      setView("detail");
    } catch (error) {
      const diagnostic = createOfficeDiagnostic(error);
      setGlobalError(diagnostic);
      setView("error");
    }
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
    try {
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
            const termsResult = await cdiscApi.listCodelistTerms(
              codelist.codelistOid,
              selectedPackage.packageOid
            );
            if (termsResult.ok) {
              termsByCodelistOid[codelist.codelistOid] = termsResult.data;
            }
          })
        );
        setImportProgress({
          stage: "Fetching terms...",
          completed: Math.min(i + BATCH_SIZE, codelists.length),
          total: codelists.length,
        });
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
        setImportParseError(`Mapping error (${failure.error.code}): ${failure.error.message}`);
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
    } catch (error) {
      const diagnostic = createOfficeDiagnostic(error);
      setImportParseError(diagnostic.message);
      setImportProgress(null);
    }
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

    try {
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
        announcer.announce(
          "Dictionary Import Complete: Successfully imported terminology.",
          "polite"
        );
        setLastActionStatus({ type: "imported", message: "CDISC CT Import complete." });
        setTimeout(() => setLastActionStatus(null), 3000);
        // Reload the codelist library after a successful import
        await loadData();
      } else {
        announcer.announce(
          `Dictionary Import Complete with ${summary.errors.length} errors.`,
          "polite"
        );
      }
    } catch (error) {
      const diagnostic = createOfficeDiagnostic(error);
      setImportError(diagnostic.message);
      setImportProgress(null);
    }
  }, [importPlan, conflictResolutions]);

  const handleConflictResolution = useCallback(
    (codelistId: string, resolution: ConflictResolution) => {
      setConflictResolutions((prev) => ({ ...prev, [codelistId]: resolution }));
    },
    []
  );

  const [activeResultIndex, setActiveResultIndex] = useState(-1);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const isInput =
        (e.target as HTMLElement).tagName === "INPUT" ||
        (e.target as HTMLElement).tagName === "TEXTAREA";

      if (view === "browse" || view === "searching") {
        const items = view === "searching" ? searchResults : dictionaries;
        if (e.key === "ArrowDown" && !isInput) {
          e.preventDefault();
          setActiveResultIndex((prev) => Math.min(prev + 1, items.length - 1));
        } else if (e.key === "ArrowUp" && !isInput) {
          e.preventDefault();
          setActiveResultIndex((prev) => Math.max(prev - 1, 0));
        } else if (e.key === "Enter") {
          if (activeResultIndex >= 0 && activeResultIndex < items.length) {
            e.preventDefault();
            const item = items[activeResultIndex];
            const original =
              "id" in item
                ? item
                : dictionaries.find((d) => d.id === (item as TerminologySearchResult).id);
            if (original) {
              if (e.altKey) {
                handleUseDictionary(original.id);
              } else {
                setSelectedCodelist(original as CodelistGroup);
                setView("loading"); // Optional quick visual update before fetching fresh
                handleSelectCodelist(original.id);
              }
            }
          }
        }
      } else if (view === "detail") {
        if (e.key === "Escape") {
          e.preventDefault();
          setIsEditing(false);
          setEditItems([]);
          setView(search.trim() ? "searching" : "browse");
        } else if (e.key === "Enter" && e.altKey && selectedCodelist) {
          e.preventDefault();
          handleUseDictionary(selectedCodelist.id);
        }
      }
    },
    [
      view,
      searchResults,
      dictionaries,
      activeResultIndex,
      selectedCodelist,
      handleUseDictionary,
      search,
      handleSelectCodelist,
    ]
  );

  useEffect(() => {
    setActiveResultIndex(-1);
  }, [view, search]);

  useEffect(() => {
    const performSearch = async () => {
      const trimmedSearch = search.trim();
      if (!trimmedSearch) {
        setSearchResults([]);
        setIsSearching(false);
        if (view === "searching") setView("browse");
        return;
      }

      setIsSearching(true);
      if (view === "browse" || view === "searching") {
        setView("searching");
      }

      // Map CodelistGroup to TerminologySearchResult
      const candidates: TerminologySearchResult[] = dictionaries.map((dict) => ({
        id: dict.id,
        title: dict.name || dict.id,
        value: dict.id,
        source: "Workbook",
        matchReason: "fuzzy_match", // Default, will be updated by search service
        score: 0,
        actions: ["apply", "preview"],
        metadata: {
          codelistId: dict.id,
          itemCount: dict.items.length,
          items: dict.items,
        },
      }));

      const results = await TerminologySearchService.search(
        {
          term: trimmedSearch,
          context: {
            codelistId: selection?.fieldName,
          },
        },
        candidates
      );

      setSearchResults(results);

      // Mock CDISC results for demonstration/placeholder
      if (trimmedSearch.length > 2) {
        const mockStandard: TerminologySearchResult[] = [
          {
            id: `CDISC:${trimmedSearch.toUpperCase()}`,
            title: `${trimmedSearch.charAt(0).toUpperCase() + trimmedSearch.slice(1)} (Standard)`,
            value: trimmedSearch.toUpperCase(),
            source: "CDISC SDTM",
            matchReason: "fuzzy_match",
            score: 0.5,
            actions: ["preview"],
          },
        ];
        setStandardResults(mockStandard);
      } else {
        setStandardResults([]);
      }

      setIsSearching(false);
    };

    const timer = setTimeout(performSearch, 300);
    return () => clearTimeout(timer);
  }, [search, dictionaries, selection, view]);

  const hasSearch = search.trim().length > 0;
  const resultSummary = hasSearch
    ? `Showing ${searchResults.length} results`
    : `${dictionaries.length} codelists available`;

  const effectiveSelectedLanguage = localLanguage || initialLanguage;

  return (
    <OverlayDrawer
      open={isOpen}
      onOpenChange={(_, data) => setIsOpen(data.open)}
      position="end"
      className={styles.root}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Zone 1: Context Header */}
      <div className={mergeClasses(styles.header, styles.zone1)}>
        <div className={styles.flexSpaceBetweenStart}>
          <div className={styles.headerBadge}>
            <Badge appearance="tint" color={selection?.isValid ? "success" : "warning"}>
              {selection?.sheetName || "Excel"}{" "}
              {selection?.isValid
                ? `> ${selection.fieldName || selection.address}`
                : "(Selection Invalid)"}
            </Badge>
          </div>
        </div>
        <div className={styles.flexSpaceBetweenCenter}>
          <Text className={styles.headerTitle}>
            <span>📚 {selection?.fieldName || "Codelist Library"}</span>
          </Text>
          {selection?.value && (
            <Badge
              appearance="outline"
              color="brand"
className={styles.headerBtn}
            >
              Value: {String(selection.value)}
            </Badge>
          )}
        </div>
      </div>

      <div className={styles.body}>
        {view === "loading" && (
          <div className={styles.loadingState}>
            <Spinner size="medium" label="Syncing..." />
          </div>
        )}

        {view === "error" && globalError && (
          <div className={styles.loadingState}>
            <div className={styles.fontSize48Margin12}>⚠️</div>
            <Text weight="bold" size={400} block>
              {globalError.message}
            </Text>
            <Text size={200} className={styles.textColorNeutral3}>
              {globalError.recoveryAction}
            </Text>
            {globalError.allowRetry && (
              <Button appearance="primary" className={styles.marginTop16} onClick={loadData}>
                Retry Sync
              </Button>
            )}
            <Button
              appearance="subtle"
              className={styles.marginTop8}
              onClick={() => setView("browse")}
            >
              Cancel
            </Button>
          </div>
        )}

        {view === "no-selection" && (
          <div className={styles.loadingState}>
            <div className={styles.fontSize48Margin12}>🎯</div>
            <Text weight="bold" size={400} block>
              No Active Context
            </Text>
            <Text size={200} className={styles.textColorNeutral3}>
              Select a single cell in a CRF sheet to enable dictionary synchronization.
            </Text>
            <Button
              appearance="outline"
              className={styles.marginTop16}
              onClick={() => {
                setManualOverride(true);
                setView("browse");
              }}
            >
              Browse Library Anyway
            </Button>
          </div>
        )}

        {view === "detail" && selectedCodelist && (
          <>
            {/* Zone 4: Selected Detail Panel */}
            <div className={styles.zone4}>
              <div
                className={styles.flexRowGap8CenterMarginBottom8}
              >
                <Button
                  appearance="subtle"
                  icon={<ArrowLeftRegular />}
                  onClick={() => {
                    setIsEditing(false);
                    setEditItems([]);
                    setView(search.trim() ? "searching" : "browse");
                  }}
                  aria-label="Back to results"
                />
                <Text weight="bold" size={400}>
                  {selectedCodelist.id}
                </Text>
                {!isEditing && (
                  <Button
                    size="small"
                    appearance="subtle"
                    onClick={handleStartEdit}
                    className={styles.marginLeftAuto}
                  >
                    Edit
                  </Button>
                )}
              </div>

              <div className={styles.formCard}>
                <div className={styles.flexColumnGap4}>
                  <Text
                    size={100}
                    weight="semibold"
                    className={styles.textColorNeutral3}
                  >
                    DISPLAY NAME
                  </Text>
                  <Text>{selectedCodelist.name || "—"}</Text>
                </div>
                <div className={styles.flexColumnGap4}>
                  <Text
                    size={100}
                    weight="semibold"
                    className={styles.textColorNeutral3}
                  >
                    SOURCE
                  </Text>
                  <Text>Workbook</Text>
                </div>
              </div>

              <div
className={styles.flexGrowColumnGap8}
              >
                <div
                  className={styles.flexSpaceBetweenCenter}
                >
                  <Text weight="semibold">Values & Decodes</Text>
                  {!isEditing && supportedLanguages.length > 1 && (
                    <TabList
                      selectedValue={effectiveSelectedLanguage}
                      onTabSelect={(_e, data) => setLocalLanguage(data.value as string)}
                      size="small"
                    >
                      {supportedLanguages.map((lang) => (
                        <Tab key={lang} value={lang}>
                          {lang}
                        </Tab>
                      ))}
                    </TabList>
                  )}
                </div>

                <div
className={styles.flexGrowColumnGap8Auto}
                >
                  {(isEditing ? editItems : selectedCodelist.items).map((item, idx) => {
                    if (isEditing) {
                      return (
                        <div
                          key={idx}
                          className={styles.gridCard}
className={styles.flexColumnGap8Padding10}
                        >
                          <div className={styles.flexRowGap8Center}>
                            <Input
                              size="small"
                              placeholder="Value"
                              value={item.codedValue}
                              onChange={(_, d) => {
                                const next = [...editItems];
                                next[idx].codedValue = d.value;
                                setEditItems(next);
                              }}
                              className={styles.width80}
                            />
                            <Button
                              size="small"
                              appearance="subtle"
                              onClick={() => {
                                const next = editItems.filter((_, i) => i !== idx);
                                setEditItems(next);
                              }}
                              aria-label={`Delete row ${idx + 1}`}
                            >
                              Del
                            </Button>
                          </div>
                          <div className={styles.flexColumnGap4}>
                            {supportedLanguages.map((lang) => (
                              <Input
                                key={lang}
                                size="small"
                                placeholder={`Decode (${lang})`}
                                value={item.decodedText[lang] || ""}
                                onChange={(_, d) => {
                                  const next = [...editItems];
                                  next[idx].decodedText = {
                                    ...next[idx].decodedText,
                                    [lang]: d.value,
                                  };
                                  setEditItems(next);
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    }

                    const translation = LinguisticService.resolveTranslation(
                      item.decodedText,
                      effectiveSelectedLanguage,
                      defaultLanguage
                    );
                    return (
                      <div
                        key={idx}
                        className={styles.gridCard}
className={styles.flexRowGap12CenterPadding10}
                      >
                        <Badge
                          appearance="filled"
                          color="brand"
                          className={styles.minWidth30Center}
                        >
                          {item.codedValue}
                        </Badge>
                        <div className={styles.flexColumn}>
                          <Text>{translation.content}</Text>
                          {translation.isFallback && (
                            <Text
                              size={100}
                              italic
                              className={styles.textColorMarigold}
                            >
                              Showing fallback ({translation.locale})
                            </Text>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {isEditing && (
                    <Button
                      appearance="subtle"
                      icon={<AddRegular />}
                      onClick={() =>
                        setEditItems([
                          ...editItems,
                          { codedValue: "", decodedText: { [defaultLanguage]: "" } },
                        ])
                      }
                    >
                      Add Row
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Zone 5: Footer Actions */}
            <div className={styles.zone5}>
              {lastActionStatus && (
                <MessageBar intent="success">
                  <MessageBarBody>{lastActionStatus.message}</MessageBarBody>
                </MessageBar>
              )}
              {globalError && !["error", "loading"].includes(view) && (
                <MessageBar intent="error">
                  <MessageBarBody>
                    <div
className={styles.flexSpaceBetweenStart}
                    >
                      <div>
                        <Text weight="bold">{globalError.message}</Text>
                        <br />
                        <Text size={100}>{globalError.recoveryAction}</Text>
                      </div>
                      <Button size="small" appearance="subtle" onClick={() => setGlobalError(null)}>
                        Dismiss
                      </Button>
                    </div>
                  </MessageBarBody>
                </MessageBar>
              )}
              {isEditing ? (
                <div className={styles.flexRowGap8}>
                  <Button
                    appearance="secondary"
                    className={styles.flexGrow1}
                    onClick={() => setIsEditing(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    appearance="primary"
                    className={styles.flexGrow1}
                    onClick={handleSaveEdit}
                    disabled={editItems.length === 0 || editItems.some((i) => !i.codedValue)}
                  >
                    Save Changes
                  </Button>
                </div>
              ) : (
                <Button
                  appearance="primary"
                  className={styles.saveButton}
                  onClick={() => handleUseDictionary(selectedCodelist.id)}
                >
                  Apply Codelist to Cell
                </Button>
              )}
            </div>
          </>
        )}

        {(view === "browse" || view === "searching") && (
          <>
            {/* Zone 2: Search & Input */}
            <div className={styles.zone2}>
              <Input
                className={styles.searchInput}
                placeholder="Search by ID, name, or value..."
                value={search}
                onChange={(_, d) => setSearch(d.value)}
                aria-label="Search codelists"
              />
              {supportedLanguages.length > 1 && (
                <TabList
                  selectedValue={effectiveSelectedLanguage}
                  onTabSelect={(_e, data) => setLocalLanguage(data.value as string)}
                  size="small"
                >
                  {supportedLanguages.map((lang) => (
                    <Tab key={lang} value={lang}>
                      {lang}
                    </Tab>
                  ))}
                </TabList>
              )}
            </div>

            {/* Zone 3: Ranked Result List */}
            <div className={styles.zone3}>
              <div className={styles.resultsSummary}>
                <Text size={100} italic>
                  {resultSummary}
                </Text>
                {isSearching && <Spinner size="tiny" label="Searching..." labelPosition="after" />}
              </div>

              {view === "searching" ? (
                <div className={styles.flexColumnGap12}>
                  {searchResults.length > 0 ? (
                    <>
                      <Text
                        weight="semibold"
                        size={100}
                        className={styles.textColorNeutral3}
                      >
                        WORKBOOK MATCHES
                      </Text>
                      {searchResults.map((result, index) => (
                        <Card
                          role="button"
                          key={result.id}
                          className={styles.gridCard}
                          aria-label={`View details for codelist ${result.id}: ${result.title}`}
className={mergeClasses(styles.padding12Cursor, activeResultIndex === index ? styles.activeResultBorder : styles.inactiveResultBorder)}
                          onClick={() => {
                            const original = dictionaries.find((d) => d.id === result.id);
                            if (original) {
                              handleSelectCodelist(original.id);
                            }
                          }}
                        >
                          <div
className={styles.flexSpaceBetweenStart}
                          >
                            <Text weight="bold" className={styles.fontSizeBase300}>
                              {result.id}
                            </Text>
                            <Badge size="small" color="brand" appearance="tint">
                              {Math.round(result.score * 100)}%
                            </Badge>
                          </div>
                          <Text size={100} block className={styles.marginBottom4}>
                            {result.title}
                          </Text>
                          <Text size={100} italic className={styles.textColorNeutral3}>
                            {result.matchReason.replace("_", " ")}
                          </Text>
                        </Card>
                      ))}
                    </>
                  ) : (
                    !isSearching && (
                      <div className={styles.emptyText}>
                        <Text block size={100} className={styles.marginBottom12}>
                          No workbook matches found for "{search}".
                        </Text>
                        <Button
                          size="small"
                          appearance="outline"
                          icon={<AddRegular />}
                          onClick={() => {
                            setNewId(search.toUpperCase());
                            setView("create");
                          }}
                        >
                          Create New Codelist
                        </Button>
                      </div>
                    )
                  )}

                  {standardResults.length > 0 && (
                    <>
                      <Divider />
                      <Text
                        weight="semibold"
                        size={100}
                        className={styles.textColorNeutral3}
                      >
                        STANDARD MATCHES (CDISC)
                      </Text>
                      {standardResults.map((result) => (
                        <div
                          key={result.id}
                          className={mergeClasses(styles.gridCard, styles.padding12Op80)}
                        >
                          <div
className={styles.flexSpaceBetweenStart}
                          >
                            <Text weight="bold" className={styles.fontSizeBase300}>
                              {result.id}
                            </Text>
                            <Badge size="small" appearance="tint">
                              Standard
                            </Badge>
                          </div>
                          <Text size={100} block className={styles.marginBottom4}>
                            {result.title}
                          </Text>
                          <Text size={100} italic className={styles.textColorNeutral3}>
                            Source: {result.source}
                          </Text>
                          <Button
                            size="small"
                            appearance="subtle"
                            className={styles.marginTop4}
                            disabled
                          >
                            Import to Workbook
                          </Button>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              ) : (
                <div className={styles.flexColumnGap8}>
                  {dictionaries.length > 0 ? (
                    dictionaries.map((item, index) => (
                      <Card
                        role="button"
                        key={item.id}
                        className={styles.gridCard}
                        aria-label={`View details for codelist ${item.id}: ${item.name}`}
className={mergeClasses(styles.padding12Cursor, activeResultIndex === index ? styles.activeResultBorder : styles.inactiveResultBorder)}
                        onClick={() => {
                          handleSelectCodelist(item.id);
                        }}
                      >
                        <div
className={styles.flexSpaceBetweenStart}
                        >
                          <Text weight="bold" className={styles.fontSizeBase300}>
                            {item.id}
                          </Text>
                          <Badge size="small" appearance="outline">
                            {item.items.length} items
                          </Badge>
                        </div>
                        <Text size={100} block className={styles.marginBottom4}>
                          {item.name}
                        </Text>

                        <div className={styles.tagRow}>
                          {getDictionaryPreview(
                            item.items,
                            effectiveSelectedLanguage,
                            defaultLanguage
                          ).previewItems.map((p) => (
                            <span key={p} className={styles.tag}>
                              {p}
                            </span>
                          ))}
                        </div>
                      </Card>
                    ))
                  ) : (
                    <div className={styles.emptyText}>
                      <div className={styles.fontSize32Margin8}>📖</div>
                      <Text block size={200} weight="semibold">
                        Workbook Library is Empty
                      </Text>
                      <Text
                        block
                        size={100}
className={styles.textColorNeutral3Margin4_16}
                      >
                        You haven't defined any codelists in this workbook yet.
                      </Text>
                      <Button
                        appearance="primary"
                        icon={<AddRegular />}
                        onClick={() => setView("create")}
                      >
                        Get Started: Create Codelist
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Zone 5: Footer Actions */}
            <div className={styles.zone5}>
              {lastActionStatus && (
                <MessageBar intent="success">
                  <MessageBarBody>{lastActionStatus.message}</MessageBarBody>
                </MessageBar>
              )}
              {globalError && !["error", "loading"].includes(view) && (
                <MessageBar intent="error">
                  <MessageBarBody>
                    <div
className={styles.flexSpaceBetweenStart}
                    >
                      <div>
                        <Text weight="bold">{globalError.message}</Text>
                        <br />
                        <Text size={100}>{globalError.recoveryAction}</Text>
                      </div>
                      <Button size="small" appearance="subtle" onClick={() => setGlobalError(null)}>
                        Dismiss
                      </Button>
                    </div>
                  </MessageBarBody>
                </MessageBar>
              )}
              <div className={styles.flexRowGap8}>
                <Button
                  appearance="secondary"
                  size="small"
                  className={styles.flexGrow1}
                  icon={<ArrowDownloadRegular />}
                  onClick={handleOpenImport}
                >
                  Import
                </Button>
                <Button
                  appearance="primary"
                  size="small"
                  className={styles.flexGrow1}
                  icon={<AddRegular />}
                  onClick={() => setView("create")}
                >
                  Create New
                </Button>
              </div>
            </div>
          </>
        )}

        {view === "create" && (
          <div className={styles.createForm}>
            <Button
              appearance="subtle"
              size="small"
              icon={<ArrowLeftRegular />}
              onClick={() => setView("browse")}
              aria-label="Back to browse library"
            >
              Back to Browse
            </Button>

            <div className={styles.formCard}>
              <div>
                <div
                  className={styles.flexRowGap4Center}
                >
                  <label className={mergeClasses(styles.fieldLabel, styles.marginBottom0)}>
                    Codelist ID
                  </label>
                  <Tooltip
                    content="A unique identifier for the codelist (OID). In CDISC, this often matches the NCI Code or a study-specific alias."
                    relationship="label"
                  >
                    <InfoRegular
className={styles.helpIcon12}
                    />
                  </Tooltip>
                </div>
                <Input
                  value={newId}
                  onChange={(_, d) => setNewId(d.value.toUpperCase())}
                  placeholder="e.g. SEV_DICT"
                  className={styles.width100Upper}
                />
              </div>
              <div>
                <label className={styles.fieldLabel}>Display Name</label>
                <Input
                  value={newName}
                  onChange={(_, d) => setNewName(d.value)}
                  placeholder="e.g. Severity Scale"
                  className={styles.width100}
                />
              </div>

              <Divider />

              <div>
                <label className={styles.fieldLabel}>Values &amp; Decodes</label>
                {newItems.map((item, idx) => (
                  <div
                    key={idx}
className={mergeClasses(styles.marginBottom16, idx < newItems.length - 1 ? styles.borderBottomSolid : styles.borderBottomNone)}
                  >
                    <div className={mergeClasses(styles.valueRow, styles.marginBottom8)}>
                      <Input
                        placeholder="Value (e.g. 1)"
                        value={item.codedValue}
                        onChange={(_, d) => {
                          const updated = [...newItems];
                          updated[idx].codedValue = d.value;
                          setNewItems(updated);
                        }}
                        className={styles.width100}
                      />
                    </div>
                    <div
className={mergeClasses(styles.flexColumnGap12, supportedLanguages.length > 1 ? styles.gridLanguages : styles.gridLanguagesSingle)}
                    >
                      {supportedLanguages.map((lang) => (
                        <div key={lang} className={styles.marginBottom4}>
                          <div
className={styles.flexRowGap4Center}
                          >
                            <label
                              className={mergeClasses(styles.fieldLabel, styles.fontSizeBase100Margin0)}
                            >
                              Decode ({lang}) {lang === defaultLanguage && "(Default)"}
                            </label>
                            <Tooltip
                              content="The user-friendly text associated with the coded value for this locale."
                              relationship="label"
                            >
                              <InfoRegular
className={styles.helpIcon10}
                              />
                            </Tooltip>
                          </div>
                          <Input
                            placeholder={`Decode in ${lang}`}
                            value={item.decodedText[lang] || ""}
                            onChange={(_, d) => {
                              const updated = [...newItems];
                              updated[idx].decodedText = {
                                ...updated[idx].decodedText,
                                [lang]: d.value,
                              };
                              setNewItems(updated);
                            }}
                            className={mergeClasses(styles.valueInput, styles.width100)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                <Button
                  appearance="subtle"
                  size="small"
                  icon={<AddRegular />}
                  onClick={() =>
                    setNewItems([
                      ...newItems,
                      { codedValue: "", decodedText: { [defaultLanguage]: "" } },
                    ])
                  }
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
            <UniversalWizard
              onCancel={() => {
                setImportPlan(null);
                setImportSummary(null);
                setImportError(null);
                setView("browse");
              }}
              steps={[
                {
                  id: "browse",
                  label: "Select Package",
                  canNext: !!selectedPackage,
                  nextLabel: "Preview & Plan Import",
                  onNext: async () => {
                    await handlePlanImport();
                    if (!importPlan && importParseError) {
                      throw new Error(importParseError);
                    }
                  },
                  content: (
                    <div className={styles.formCard}>
                      <Text block className={styles.fontWeightSemibold}>
                        Import Controlled Terminology
                      </Text>
                      <Text
                        block
className={styles.textColorNeutral3FontSize100}
                      >
                        Search and browse CDISC Controlled Terminology packages to import into your
                        workbook.
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
                        <div
                          className={mergeClasses(styles.gridCard, styles.maxHeight300Auto)}
                        >
                          {importPackages
                            .filter(
                              (pkg) =>
                                (pkg.title || pkg.packageOid)
                                  .toLowerCase()
                                  .includes(importPackageSearch.toLowerCase()) ||
                                pkg.packageOid
                                  .toLowerCase()
                                  .includes(importPackageSearch.toLowerCase())
                            )
                            .map((pkg) => (
                              <Card
                                role="button"
                                key={pkg.packageOid}
className={mergeClasses(styles.packageItem, selectedPackage?.packageOid === pkg.packageOid ? styles.packageItemActive : styles.packageItemInactive)}
                                onClick={() => setSelectedPackage(pkg)}
                                aria-label={`Select package ${pkg.title || pkg.packageOid}`}
                              >
                                <Text block className={styles.fontWeightSemibold}>
                                  {pkg.title || pkg.packageOid}
                                </Text>
                                <Text
                                  block
className={styles.textColorNeutral3FontSize100}
                                >
                                  OID: {pkg.packageOid}{" "}
                                  {pkg.effectiveDate && `| Effective: ${pkg.effectiveDate}`}
                                </Text>
                              </Card>
                            ))}
                        </div>
                      )}
                      {importParseError && (
                        <MessageBar intent="error">
                          <MessageBarBody>{importParseError}</MessageBarBody>
                        </MessageBar>
                      )}
                    </div>
                  ),
                },
                {
                  id: "conflicts",
                  label: "Review Plan",
                  nextLabel: "Execute Import ✓",
                  onNext: async () => {
                    await handleExecuteImport();
                  },
                  content: importPlan ? (
                    <>
                      <div className={styles.formCard}>
                        <Text block className={styles.fontWeightSemibold}>
                          Import Plan
                        </Text>
                        <div className={styles.summaryRow}>
                          <Text>New codelists to insert</Text>
                          <Text className={styles.summaryCount}>
                            {importPlan.autoInsertIds.size}
                          </Text>
                        </div>
                        <div className={styles.summaryRow}>
                          <Text>Codelists with newer version (auto-overwrite)</Text>
                          <Text className={styles.summaryCount}>
                            {importPlan.autoOverwriteIds.size}
                          </Text>
                        </div>
                        <div className={styles.summaryRow}>
                          <Text>Identical codelists (auto-skip)</Text>
                          <Text className={styles.summaryCount}>
                            {importPlan.skipIdenticalIds.size}
                          </Text>
                        </div>
                        <div className={styles.summaryRow}>
                          <Text>Conflicts requiring resolution</Text>
                          <Text className={styles.summaryCount}>{importPlan.conflictIds.size}</Text>
                        </div>
                      </div>
                      {importPlan.conflicts.length > 0 && (
                        <div className={styles.conflictCard}>
                          <Text block className={styles.fontWeightSemibold}>
                            Resolve Conflicts
                          </Text>
                          {importPlan.conflicts.map((conflict) => (
                            <div key={conflict.codelistId} className={styles.conflictItem}>
                              <Text block className={styles.fontWeightSemibold}>
                                {conflict.codelistId}
                              </Text>
                              <div className={styles.conflictActions}>
                                <Button
                                  appearance={
                                    conflictResolutions[conflict.codelistId] === "skip"
                                      ? "primary"
                                      : "outline"
                                  }
                                  onClick={() =>
                                    handleConflictResolution(conflict.codelistId, "skip")
                                  }
                                >
                                  Skip
                                </Button>
                                <Button
                                  appearance={
                                    conflictResolutions[conflict.codelistId] === "overwrite"
                                      ? "primary"
                                      : "outline"
                                  }
                                  onClick={() =>
                                    handleConflictResolution(conflict.codelistId, "overwrite")
                                  }
                                >
                                  Overwrite
                                </Button>
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
                      {importProgress && (
                        <div className={mergeClasses(styles.progressCard, styles.marginTop16)}>
                          <Text block className={styles.fontWeightSemibold}>
                            {importProgress.stage}
                          </Text>
                          <ProgressBar
                            value={
                              importProgress.total > 0
                                ? importProgress.completed / importProgress.total
                                : undefined
                            }
                          />
                          <Text
className={styles.textColorNeutral3FontSize100}
                          >
                            {importProgress.total > 0
                              ? `${importProgress.completed} / ${importProgress.total}`
                              : "Processing…"}
                          </Text>
                        </div>
                      )}
                    </>
                  ) : importProgress ? (
                    <div className={mergeClasses(styles.progressCard, styles.marginTop16)}>
                      <Text block className={styles.fontWeightSemibold}>
                        {importProgress.stage}
                      </Text>
                      <ProgressBar
                        value={
                          importProgress.total > 0
                            ? importProgress.completed / importProgress.total
                            : undefined
                        }
                      />
                      <Text
                        className={styles.textColorNeutral3FontSize100}
                      >
                        {importProgress.total > 0
                          ? `${importProgress.completed} / ${importProgress.total}`
                          : "Processing…"}
                      </Text>
                    </div>
                  ) : null,
                },
                {
                  id: "summary",
                  label: "Summary",
                  hideNext: true,
                  hideCancel: true,
                  backLabel: "Done",
                  onBack: () => {
                    setImportPlan(null);
                    setImportSummary(null);
                    setView("browse");
                  },
                  content: importSummary ? (
                    <div className={styles.summaryCard}>
                      <Text block className={styles.fontWeightSemibold}>
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
                    </div>
                  ) : null,
                },
              ]}
            />
          </div>
        )}
      </div>
    </OverlayDrawer>
  );
};
