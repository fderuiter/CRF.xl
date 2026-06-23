/**
 * @issue #39, #86
 */
import * as React from "react";
import { useState, useMemo, useCallback } from "react";
import {
  makeStyles,
  tokens,
  Text,
  Input,
  Dropdown,
  Option,
  Button,
  Badge,
  Card,
  Spinner,
  MessageBar,
  MessageBarBody,
  Divider,
} from "@fluentui/react-components";
import {
  SearchRegular,
  FilterRegular,
  GlobeRegular,
  AddRegular,
  ChevronRightRegular,
  AlertRegular,
} from "@fluentui/react-icons";
import { StudyDesign, TranslationStatus } from "../../core/types";
import {
  extractTranslatableItems,
  filterTranslatableItems,
  getTranslationStatus,
  TranslatableItem,
} from "../../core/services/linguistic-service";
import { TranslationDetailView } from "./TranslationDetailView";

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    height: "100%",
  },
  header: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  filterBar: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },
  scrollArea: {
    flexGrow: 1,
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    paddingRight: "4px",
  },
  itemCard: {
    cursor: "pointer",
    ":hover": {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
  itemHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "8px",
  },
  itemSource: {
    fontSize: tokens.fontSizeBase100,
    color: tokens.colorNeutralForeground3,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  itemBaseValue: {
    fontWeight: tokens.fontWeightSemibold,
    display: "-webkit-box",
    "-webkit-line-clamp": "2",
    "-webkit-box-orient": "vertical",
    overflow: "hidden",
  },
  statusRow: {
    display: "flex",
    gap: "4px",
    flexWrap: "wrap",
    marginTop: "4px",
  },
  localeBadge: {
    fontSize: "10px",
  },
  emptyState: {
    textAlign: "center",
    padding: "32px 16px",
    color: tokens.colorNeutralForeground3,
    border: `1px dashed ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
  },
});

interface TranslationManagerViewProps {
  study: StudyDesign | null;
  onUpdateStudy?: (updatedStudy: StudyDesign) => void;
  onUpdateTranslation?: (item: TranslatableItem, locale: string, unit: any) => Promise<void>;
}

export const TranslationManagerView: React.FC<TranslationManagerViewProps> = ({
  study,
  onUpdateStudy,
  onUpdateTranslation,
}) => {
  const styles = useStyles();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TranslationStatus | "all">("all");
  const [activeLocale, setActiveLocale] = useState<string>("");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const translatableItems = useMemo(() => (study ? extractTranslatableItems(study) : []), [study]);

  const baseLocale = study?.metadata.defaultLanguage || "en-US";
  const supportedLocales = study?.metadata.supportedLanguages || [baseLocale];

  // Initialize active locale if not set
  React.useEffect(() => {
    if (!activeLocale && supportedLocales.length > 0) {
      setActiveLocale(supportedLocales.find(l => l !== baseLocale) || baseLocale);
    }
  }, [supportedLocales, baseLocale, activeLocale]);

  const filteredItems = useMemo(() => {
    return filterTranslatableItems(translatableItems, {
      search,
      statusFilter,
      locale: activeLocale,
    });
  }, [translatableItems, search, statusFilter, activeLocale]);

  const handleSelectItem = (item: TranslatableItem) => {
    setSelectedItemId(item.id);
  };

  const handleBack = () => {
    setSelectedItemId(null);
  };

  const selectedItem = useMemo(
    () => translatableItems.find((i) => i.id === selectedItemId) || null,
    [translatableItems, selectedItemId]
  );

  if (selectedItem) {
    return (
      <TranslationDetailView
        item={selectedItem}
        baseLocale={baseLocale}
        supportedLocales={supportedLocales}
        onBack={handleBack}
        onUpdateTranslation={async (locale, unit) => {
          if (onUpdateTranslation) {
            await onUpdateTranslation(selectedItem, locale, unit);
          }
        }}
      />
    );
  }

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <Text weight="bold" size={400}>
          Translation Management
        </Text>
        <div className={styles.filterBar}>
          <Input
            placeholder="Search items..."
            value={search}
            onChange={(_, d) => setSearch(d.value)}
            contentBefore={<SearchRegular />}
            style={{ flexGrow: 1 }}
          />
          <Dropdown
            placeholder="Target Locale"
            value={activeLocale}
            selectedOptions={[activeLocale]}
            onOptionSelect={(_, d) => setActiveLocale(d.optionValue || "")}
            style={{ width: "120px" }}
          >
            {supportedLocales.map((locale) => (
              <Option key={locale} value={locale}>
                {locale}
              </Option>
            ))}
          </Dropdown>
        </div>
        <div className={styles.filterBar}>
          <Dropdown
            placeholder="Status Filter"
            value={statusFilter === "all" ? "All Statuses" : statusFilter}
            selectedOptions={[statusFilter]}
            onOptionSelect={(_, d) => setStatusFilter((d.optionValue as any) || "all")}
            style={{ flexGrow: 1 }}
          >
            <Option value="all">All Statuses</Option>
            <Option value={TranslationStatus.Missing}>Missing</Option>
            <Option value={TranslationStatus.NeedsReview}>Needs Review</Option>
            <Option value={TranslationStatus.Translated}>Translated</Option>
            <Option value={TranslationStatus.Outdated}>Outdated</Option>
          </Dropdown>
        </div>
      </div>

      <Divider />

      <div className={styles.scrollArea}>
        {filteredItems.length > 0 ? (
          filteredItems.map((item) => (
            <Card
              key={item.id}
              className={styles.itemCard}
              onClick={() => handleSelectItem(item)}
            >
              <div className={styles.itemHeader}>
                <div style={{ flexGrow: 1 }}>
                  <Text className={styles.itemSource}>{item.source}</Text>
                  <Text className={styles.itemBaseValue} block>
                    {item.baseValue}
                  </Text>
                </div>
                <ChevronRightRegular />
              </div>
              <div className={styles.statusRow}>
                {supportedLocales.map((locale) => {
                  const status = getTranslationStatus(item, locale);
                  const isMissing = status === TranslationStatus.Missing;
                  const isTarget = locale === activeLocale;

                  return (
                    <Badge
                      key={locale}
                      appearance={isTarget ? "filled" : "outline"}
                      color={
                        status === TranslationStatus.Missing
                          ? "danger"
                          : status === TranslationStatus.NeedsReview
                          ? "warning"
                          : "success"
                      }
                      className={styles.localeBadge}
                      icon={isMissing ? <AlertRegular /> : undefined}
                    >
                      {locale}
                    </Badge>
                  );
                })}
              </div>
            </Card>
          ))
        ) : (
          <div className={styles.emptyState}>
            <Text>No translatable items found.</Text>
          </div>
        )}
      </div>
    </div>
  );
};
