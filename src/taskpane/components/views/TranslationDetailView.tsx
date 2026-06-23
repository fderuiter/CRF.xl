/**
 * @issue #39, #86
 */
import * as React from "react";
import { useState } from "react";
import {
  makeStyles,
  tokens,
  Text,
  Button,
  Divider,
  Input,
  Textarea,
  Dropdown,
  Option,
  Label,
  Card,
} from "@fluentui/react-components";
import { ArrowLeftRegular, SaveRegular } from "@fluentui/react-icons";
import { TranslationStatus, TranslationUnit } from "../../core/types";
import { TranslatableItem } from "../../core/services/linguistic-service";
import { isTranslationUnit, createTranslationUnit } from "../../core/models/multilingual-model";

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    height: "100%",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  sourceSection: {
    backgroundColor: tokens.colorNeutralBackground2,
    padding: "12px",
    borderRadius: tokens.borderRadiusMedium,
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  sourceLabel: {
    fontSize: tokens.fontSizeBase100,
    color: tokens.colorNeutralForeground3,
    textTransform: "uppercase",
    fontWeight: tokens.fontWeightBold,
  },
  translationGrid: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
    overflowY: "auto",
    paddingBottom: "20px",
  },
  translationBlock: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  localeHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  localeTitle: {
    fontWeight: tokens.fontWeightBold,
    color: tokens.colorBrandForeground1,
  },
  footer: {
    marginTop: "auto",
    paddingTop: "12px",
    borderTop: `1px solid ${tokens.colorNeutralStroke1}`,
  },
  saveButton: {
    width: "100%",
  },
});

interface TranslationDetailViewProps {
  item: TranslatableItem;
  baseLocale: string;
  supportedLocales: string[];
  onBack: () => void;
  onUpdateTranslation: (locale: string, unit: TranslationUnit) => void;
}

export const TranslationDetailView: React.FC<TranslationDetailViewProps> = ({
  item,
  baseLocale,
  supportedLocales,
  onBack,
  onUpdateTranslation,
}) => {
  const styles = useStyles();

  // Local state for edits
  const [edits, setEdits] = useState<Record<string, { value: string; status: TranslationStatus }>>(
    () => {
      const initial: Record<string, { value: string; status: TranslationStatus }> = {};
      supportedLocales.forEach((locale) => {
        const entry = item.translations[locale];
        if (isTranslationUnit(entry)) {
          initial[locale] = { value: entry.value, status: entry.status };
        } else {
          initial[locale] = {
            value: entry || "",
            status: (entry || "").trim() === "" ? TranslationStatus.Missing : TranslationStatus.Translated,
          };
        }
      });
      return initial;
    }
  );

  const handleValueChange = (locale: string, value: string) => {
    setEdits((prev) => ({
      ...prev,
      [locale]: { ...prev[locale], value },
    }));
  };

  const handleStatusChange = (locale: string, status: TranslationStatus) => {
    setEdits((prev) => ({
      ...prev,
      [locale]: { ...prev[locale], status },
    }));
  };

  const handleSave = () => {
    Object.entries(edits).forEach(([locale, data]) => {
      if (locale === baseLocale) return; // Usually don't edit base here or handle specifically
      onUpdateTranslation(locale, createTranslationUnit(data.value, data.status));
    });
    onBack();
  };

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <Button
          appearance="subtle"
          icon={<ArrowLeftRegular />}
          onClick={onBack}
          aria-label="Back to list"
        />
        <Text weight="bold" size={400}>
          Edit Translation
        </Text>
      </div>

      <div className={styles.sourceSection}>
        <Text className={styles.sourceLabel}>Source Context</Text>
        <Text size={200}>{item.source}</Text>
        <Divider style={{ margin: "4px 0" }} />
        <Text className={styles.sourceLabel}>Original Text ({baseLocale})</Text>
        <Text weight="semibold">{item.baseValue}</Text>
      </div>

      <div className={styles.translationGrid}>
        {supportedLocales
          .filter((l) => l !== baseLocale)
          .map((locale) => (
            <div key={locale} className={styles.translationBlock}>
              <div className={styles.localeHeader}>
                <Text className={styles.localeTitle}>{locale}</Text>
                <Dropdown
                  size="small"
                  value={edits[locale]?.status}
                  selectedOptions={[edits[locale]?.status]}
                  onOptionSelect={(_, d) =>
                    handleStatusChange(locale, d.optionValue as TranslationStatus)
                  }
                  style={{ width: "130px" }}
                >
                  <Option value={TranslationStatus.Translated}>Translated</Option>
                  <Option value={TranslationStatus.NeedsReview}>Needs Review</Option>
                  <Option value={TranslationStatus.Missing}>Missing</Option>
                  <Option value={TranslationStatus.Outdated}>Outdated</Option>
                </Dropdown>
              </div>
              <Textarea
                rows={3}
                value={edits[locale]?.value}
                onChange={(_, d) => handleValueChange(locale, d.value)}
                placeholder={`Enter ${locale} translation...`}
                style={{ width: "100%" }}
              />
            </div>
          ))}

        {supportedLocales.filter(l => l !== baseLocale).length === 0 && (
          <Text size={200} italic>
            No target locales defined. Add supported languages in Study Metadata.
          </Text>
        )}
      </div>

      <div className={styles.footer}>
        <Button
          appearance="primary"
          icon={<SaveRegular />}
          className={styles.saveButton}
          onClick={handleSave}
        >
          Save Translations
        </Button>
      </div>
    </div>
  );
};
