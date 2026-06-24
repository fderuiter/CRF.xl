/**
 * @issue #128
 */
import * as React from "react";
import {
  Badge,
  Body1,
  Button,
  Card,
  Dropdown,
  MessageBar,
  MessageBarBody,
  Option,
  Tab,
  TabList,
  Text,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import { StudyDiffReport } from "../../core";
import {
  DiffChangeClass,
  DiffEntityGroup,
  DiffSeverity,
  buildStudyDiffList,
  filterStudyDiffList,
  paginateStudyDiffList,
} from "./study-diff-view-utils";
import { formatDate } from "../../core/utils/locale-utils";

interface StudyDiffViewProps {
  report: StudyDiffReport | null;
}

const PAGE_SIZE = 25;

const useStyles = makeStyles({
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
  summaryRow: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },
  filterGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: "8px",
    "@media (max-width: 720px)": {
      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    },
  },
  entryList: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  entryButton: {
    justifyContent: "flex-start",
    textAlign: "left",
    width: "100%",
  },
  entryContent: {
    display: "flex",
    width: "100%",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
  },
  entryText: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    minWidth: 0,
  },
  entryTitle: {
    fontWeight: tokens.fontWeightSemibold,
  },
  entrySubtitle: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase100,
  },
  detailPanel: {
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    padding: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  paginationRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "8px",
  },
});

const GROUPS: DiffEntityGroup[] = ["forms", "items", "codelists", "rules"];

export const StudyDiffView: React.FC<StudyDiffViewProps> = ({ report }) => {
  const styles = useStyles();
  const [group, setGroup] = React.useState<DiffEntityGroup>("forms");
  const [changeClass, setChangeClass] = React.useState<DiffChangeClass | "all">("all");
  const [severity, setSeverity] = React.useState<DiffSeverity | "all">("all");
  const [subsystem, setSubsystem] = React.useState<string | "all">("all");
  const [area, setArea] = React.useState<string | "all">("all");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [page, setPage] = React.useState(1);

  const entries = React.useMemo(() => (report ? buildStudyDiffList(report) : []), [report]);
  const countsByClass = React.useMemo(
    () =>
      entries.reduce<Record<string, number>>((acc, entry) => {
        acc[entry.changeClass] = (acc[entry.changeClass] || 0) + 1;
        return acc;
      }, {}),
    [entries]
  );
  const countsByGroup = React.useMemo(
    () =>
      GROUPS.reduce<Record<DiffEntityGroup, number>>(
        (acc, currentGroup) => ({
          ...acc,
          [currentGroup]: entries.filter((entry) => entry.group === currentGroup).length,
        }),
        { forms: 0, items: 0, codelists: 0, rules: 0 }
      ),
    [entries]
  );

  React.useEffect(() => {
    if (countsByGroup[group] > 0) return;
    const firstAvailable = GROUPS.find((candidate) => countsByGroup[candidate] > 0) ?? "forms";
    setGroup(firstAvailable);
  }, [countsByGroup, group]);

  const areaOptions = React.useMemo(
    () =>
      Array.from(new Set(entries.map((entry) => entry.area))).sort((left, right) =>
        left.localeCompare(right)
      ),
    [entries]
  );
  const subsystemOptions = React.useMemo(
    () =>
      Array.from(new Set(entries.map((entry) => entry.subsystem))).sort((left, right) =>
        left.localeCompare(right)
      ),
    [entries]
  );
  const filteredEntries = React.useMemo(
    () =>
      filterStudyDiffList(entries, group, {
        changeClass,
        subsystem,
        severity,
        area,
      }),
    [entries, group, changeClass, subsystem, severity, area]
  );
  const pageData = React.useMemo(
    () => paginateStudyDiffList(filteredEntries, page, PAGE_SIZE),
    [filteredEntries, page]
  );
  const selectedEntry = React.useMemo(
    () => entries.find((entry) => entry.id === selectedId) ?? null,
    [entries, selectedId]
  );

  React.useEffect(() => {
    setPage(1);
  }, [group, changeClass, severity, subsystem, area]);

  React.useEffect(() => {
    if (!selectedEntry || selectedEntry.group !== group) {
      const first = pageData.entries[0];
      setSelectedId(first ? first.id : null);
    }
  }, [selectedEntry, group, pageData.entries]);

  if (!report) {
    return (
      <Card className={styles.card}>
        <Body1>Metadata Diff (Clinical Time Machine)</Body1>
        <MessageBar>
          <MessageBarBody>
            Load a baseline workbook and validate the current study to render a diff report.
          </MessageBarBody>
        </MessageBar>
      </Card>
    );
  }

  if (entries.length === 0) {
    return (
      <Card className={styles.card}>
        <Body1>Metadata Diff (Clinical Time Machine)</Body1>
        <MessageBar intent="success">
          <MessageBarBody>
            No semantic changes detected between baseline and current study metadata.
          </MessageBarBody>
        </MessageBar>
      </Card>
    );
  }

  return (
    <Card className={styles.card}>
      <Body1>Metadata Diff (Clinical Time Machine)</Body1>
      <Text size={200}>
        {report.baselineProtocolId} → {report.currentProtocolId}
      </Text>

      <div className={styles.summaryRow}>
        <Badge appearance="outline" color="success">
          + {countsByClass.added || 0} added
        </Badge>
        <Badge appearance="outline" color="danger">
          − {countsByClass.removed || 0} removed
        </Badge>
        <Badge appearance="outline" color="warning">
          ~ {countsByClass.modified || 0} modified
        </Badge>
        <Badge appearance="outline" color="brand">
          ↔ {countsByClass.moved_or_renamed || 0} moved/renamed
        </Badge>
      </div>

      <TabList
        selectedValue={group}
        onTabSelect={(_, data) => setGroup((data.value as DiffEntityGroup) || "forms")}
      >
        {GROUPS.map((candidate) => (
          <Tab key={candidate} value={candidate}>
            {candidate} ({countsByGroup[candidate]})
          </Tab>
        ))}
      </TabList>

      <div className={styles.filterGrid}>
        <Dropdown
          value={changeClass === "all" ? "Change type" : changeClass}
          selectedOptions={[changeClass]}
          onOptionSelect={(_, data) =>
            setChangeClass((data.optionValue as DiffChangeClass | "all") || "all")
          }
        >
          <Option value="all">Change type</Option>
          <Option value="added">added</Option>
          <Option value="removed">removed</Option>
          <Option value="modified">modified</Option>
          <Option value="moved_or_renamed">moved/renamed</Option>
        </Dropdown>
        <Dropdown
          value={severity === "all" ? "Severity / importance" : severity}
          selectedOptions={[severity]}
          onOptionSelect={(_, data) =>
            setSeverity((data.optionValue as DiffSeverity | "all") || "all")
          }
        >
          <Option value="all">Severity / importance</Option>
          <Option value="high">high</Option>
          <Option value="medium">medium</Option>
          <Option value="low">low</Option>
        </Dropdown>
        <Dropdown
          value={subsystem === "all" ? "Subsystem" : subsystem}
          selectedOptions={[subsystem]}
          onOptionSelect={(_, data) => setSubsystem(data.optionValue || "all")}
        >
          <Option value="all">Subsystem</Option>
          {subsystemOptions.map((option) => (
            <Option key={option} value={option}>
              {option}
            </Option>
          ))}
        </Dropdown>
        <Dropdown
          value={area === "all" ? "Form / area" : area}
          selectedOptions={[area]}
          onOptionSelect={(_, data) => setArea(data.optionValue || "all")}
        >
          <Option value="all">Form / area</Option>
          {areaOptions.map((option) => (
            <Option key={option} value={option}>
              {option}
            </Option>
          ))}
        </Dropdown>
      </div>

      {filteredEntries.length === 0 ? (
        <MessageBar>
          <MessageBarBody>No changes match the selected filters.</MessageBarBody>
        </MessageBar>
      ) : (
        <>
          <div className={styles.entryList}>
            {pageData.entries.map((entry) => (
              <Button
                key={entry.id}
                appearance={selectedId === entry.id ? "primary" : "subtle"}
                className={styles.entryButton}
                onClick={() => setSelectedId(entry.id)}
              >
                <div className={styles.entryContent}>
                  <div className={styles.entryText}>
                    <span className={styles.entryTitle}>{entry.title}</span>
                    <span className={styles.entrySubtitle}>{entry.subtitle}</span>
                  </div>
                  <Badge>{entry.changeClass}</Badge>
                </div>
              </Button>
            ))}
          </div>

          <div className={styles.paginationRow}>
            <Text size={200}>
              Page {pageData.page} / {pageData.totalPages}
            </Text>
            <div>
              <Button
                disabled={pageData.page <= 1}
                onClick={() => setPage((current) => current - 1)}
              >
                Previous
              </Button>
              <Button
                disabled={pageData.page >= pageData.totalPages}
                onClick={() => setPage((current) => current + 1)}
              >
                Next
              </Button>
            </div>
          </div>

          {selectedEntry && (
            <div className={styles.detailPanel}>
              <Text weight="semibold">Detail</Text>
              <Text>{selectedEntry.title}</Text>
              <Text size={200}>Change: {selectedEntry.changeClass}</Text>
              <Text size={200}>Subsystem: {selectedEntry.subsystem}</Text>
              <Text size={200}>Form / area: {selectedEntry.area}</Text>
              <Text size={200}>
                Changed fields:{" "}
                {selectedEntry.changedFields.length > 0
                  ? selectedEntry.changedFields.join(", ")
                  : "N/A"}
              </Text>
              {(selectedEntry as any).justification && (
                <>
                  <Text size={200} weight="semibold" style={{ marginTop: "8px" }}>Audit Justification</Text>
                  <Text size={200}>Reason: {(selectedEntry as any).justification.reason}</Text>
                  <Text size={200}>User: {(selectedEntry as any).justification.userId} @ {formatDate((selectedEntry as any).justification.timestamp)}</Text>
                </>
              )}
            </div>
          )}
        </>
      )}
    </Card>
  );
};
