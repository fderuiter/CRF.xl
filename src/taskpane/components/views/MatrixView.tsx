import * as React from 'react';
import { Body1, Button, Card, Divider, Spinner, Input, Text, Badge, Dropdown, Option, makeStyles, tokens, MessageBar, MessageBarBody } from '@fluentui/react-components';
import { StudyDesign } from '../../core/types';
import { buildMatrixSearchEntries, filterMatrixEntries, normalizeMatrixSearch, MatrixRequiredFilter } from './matrix-view-utils';

interface MatrixProps {
    onAnalyze: () => Promise<any>;
    onDocx: () => Promise<void>;
    onOdm: () => Promise<void>;
    isProcessing: boolean;
    hasErrors: boolean;
    isLoaded: boolean;
    study: StudyDesign | null;
}

const useStyles = makeStyles({
    container: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    },
    card: {
        backgroundColor: tokens.colorNeutralBackground1,
        borderRadius: tokens.borderRadiusXLarge,
        padding: '20px',
        boxShadow: tokens.shadow4,
        border: `1px solid ${tokens.colorNeutralStroke1}`,
    },
    cardHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginBottom: '16px',
    },
    iconBox: {
        width: '32px',
        height: '32px',
        backgroundColor: tokens.colorBrandBackground2,
        borderRadius: tokens.borderRadiusMedium,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '16px',
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
    analyzeButton: {
        width: '100%',
        marginBottom: '12px',
    },
    exportGrid: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '10px',
        marginTop: '12px',
    },
    exportButton: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px',
        height: 'auto',
        padding: '12px 8px',
    },
    exportIcon: {
        fontSize: '20px',
        lineHeight: '1',
    },
    searchPanel: {
        marginTop: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    },
    searchHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '12px',
        flexWrap: 'wrap',
    },
    searchTitle: {
        fontSize: tokens.fontSizeBase200,
        fontWeight: tokens.fontWeightSemibold,
        color: tokens.colorNeutralForeground1,
    },
    searchHint: {
        fontSize: tokens.fontSizeBase100,
        color: tokens.colorNeutralForeground3,
    },
    searchRow: {
        display: 'flex',
        gap: '8px',
        alignItems: 'center',
    },
    searchInput: {
        flexGrow: 1,
    },
    filtersRow: {
        display: 'grid',
        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
        gap: '8px',
    },
    filterControl: {
        minWidth: 0,
    },
    resultsSummary: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '8px',
        flexWrap: 'wrap',
    },
    summaryText: {
        fontSize: tokens.fontSizeBase100,
        color: tokens.colorNeutralForeground3,
    },
    resultList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        maxHeight: '320px',
        overflowY: 'auto',
        paddingRight: '4px',
    },
    resultCard: {
        backgroundColor: tokens.colorNeutralBackground2,
        borderRadius: tokens.borderRadiusLarge,
        border: `1px solid ${tokens.colorNeutralStroke1}`,
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    resultHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '8px',
    },
    resultTitle: {
        fontSize: tokens.fontSizeBase200,
        fontWeight: tokens.fontWeightSemibold,
        color: tokens.colorNeutralForeground1,
    },
    resultMeta: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '6px',
    },
    resultBadges: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '6px',
    },
    previewList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
    },
    previewText: {
        fontSize: tokens.fontSizeBase100,
        color: tokens.colorNeutralForeground2,
    },
    matchHighlight: {
        backgroundColor: tokens.colorPaletteYellowBackground2,
        borderRadius: tokens.borderRadiusSmall,
        padding: '0 2px',
        fontWeight: tokens.fontWeightSemibold,
    },
    emptyState: {
        backgroundColor: tokens.colorNeutralBackground2,
        borderRadius: tokens.borderRadiusLarge,
        border: `1px dashed ${tokens.colorNeutralStroke2}`,
        padding: '16px',
        textAlign: 'center',
        color: tokens.colorNeutralForeground3,
    },
    loadingHint: {
        marginTop: '12px',
    },
});

const SEARCH_DEBOUNCE_MS = 150;

function renderHighlightedText(text: string, search: string, highlightClassName: string): React.ReactNode {
    const normalizedSearch = normalizeMatrixSearch(search);
    if (!normalizedSearch) {
        return text;
    }

    const lowerText = text.toLowerCase();
    const index = lowerText.indexOf(normalizedSearch);
    if (index === -1) {
        return text;
    }

    return (
        <>
            {text.slice(0, index)}
            <span className={highlightClassName}>{text.slice(index, index + normalizedSearch.length)}</span>
            {text.slice(index + normalizedSearch.length)}
        </>
    );
}

export const MatrixView: React.FC<MatrixProps> = ({ onAnalyze, onDocx, onOdm, isProcessing, hasErrors, isLoaded, study }) => {
    const styles = useStyles();
    const [search, setSearch] = React.useState('');
    const [debouncedSearch, setDebouncedSearch] = React.useState('');
    const [requiredFilter, setRequiredFilter] = React.useState<MatrixRequiredFilter>('all');
    const [dataTypeFilter, setDataTypeFilter] = React.useState('all');
    const [visitFilter, setVisitFilter] = React.useState('all');

    React.useEffect(() => {
        const timer = window.setTimeout(() => setDebouncedSearch(search), SEARCH_DEBOUNCE_MS);
        return () => window.clearTimeout(timer);
    }, [search]);

    const matrixEntries = React.useMemo(() => (study ? buildMatrixSearchEntries(study) : []), [study]);
    const filteredResults = React.useMemo(
        () =>
            filterMatrixEntries(matrixEntries, {
                search: debouncedSearch,
                required: requiredFilter,
                dataType: dataTypeFilter,
                visit: visitFilter,
            }),
        [matrixEntries, debouncedSearch, requiredFilter, dataTypeFilter, visitFilter]
    );
    const hasActiveFilters = search.trim().length > 0 || requiredFilter !== 'all' || dataTypeFilter !== 'all' || visitFilter !== 'all';
    const visitOptions = React.useMemo(
        () => Array.from(new Map(matrixEntries.map((entry) => [entry.eventOid, entry.eventName])).entries()),
        [matrixEntries]
    );
    const dataTypeOptions = React.useMemo(
        () => Array.from(new Set(matrixEntries.flatMap((entry) => entry.dataTypes))).sort((left, right) => left.localeCompare(right)),
        [matrixEntries]
    );
    const clearFilters = React.useCallback(() => {
        setSearch('');
        setDebouncedSearch('');
        setRequiredFilter('all');
        setDataTypeFilter('all');
        setVisitFilter('all');
    }, []);

    return (
        <div className={styles.container}>
            <Card className={styles.card}>
                <div className={styles.cardHeader}>
                    <div className={styles.iconBox}>📅</div>
                    <div>
                        <Body1 className={styles.cardTitle}>Visit Matrix</Body1>
                        <Body1 className={styles.cardSubtitle}>Schedule &amp; Export</Body1>
                    </div>
                </div>

                <Button
                    appearance="primary"
                    className={styles.analyzeButton}
                    onClick={onAnalyze}
                    disabled={isProcessing}
                    icon={isProcessing ? <Spinner size="tiny" /> : <span>🔍</span>}
                >
                    Validate Entire Study
                </Button>

                <Divider />

                <div className={styles.exportGrid}>
                    <Button
                        appearance="outline"
                        className={styles.exportButton}
                        onClick={onDocx}
                        disabled={isProcessing || hasErrors || !isLoaded}
                    >
                        <span className={styles.exportIcon}>📄</span>
                        <span>Paper CRF</span>
                    </Button>
                    <Button
                        appearance="outline"
                        className={styles.exportButton}
                        onClick={onOdm}
                        disabled={isProcessing || hasErrors || !isLoaded}
                    >
                        <span className={styles.exportIcon}>⚛️</span>
                        <span>ODM XML</span>
                    </Button>
                </div>

                {hasErrors && (
                    <MessageBar intent="error" style={{ marginTop: '12px' }}>
                        <MessageBarBody>Critical errors detected. Resolve highlighted issues in Excel to unlock export.</MessageBarBody>
                    </MessageBar>
                )}

                <div className={styles.searchPanel}>
                    <div className={styles.searchHeader}>
                        <div>
                            <Text className={styles.searchTitle} block>Quick Search</Text>
                            <Text className={styles.searchHint} block>
                                Filter matrix assignments by form, visit, variable, or label without re-reading Excel.
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
                            <div className={styles.searchRow}>
                                <Input
                                    className={styles.searchInput}
                                    placeholder="Search form OID, form name, visit, variable OID, or variable label..."
                                    value={search}
                                    onChange={(_, data) => setSearch(data.value)}
                                    aria-label="Quick search matrix"
                                />
                            </div>
                            <div className={styles.filtersRow}>
                                <Dropdown
                                    className={styles.filterControl}
                                    value={requiredFilter === 'all' ? 'Required / optional' : requiredFilter === 'required' ? 'Required only' : 'Optional only'}
                                    selectedOptions={[requiredFilter]}
                                    onOptionSelect={(_, data) => setRequiredFilter((data.optionValue as MatrixRequiredFilter) || 'all')}
                                >
                                    <Option value="all">Required / optional</Option>
                                    <Option value="required">Required only</Option>
                                    <Option value="optional">Optional only</Option>
                                </Dropdown>
                                <Dropdown
                                    className={styles.filterControl}
                                    value={dataTypeFilter === 'all' ? 'Data type' : dataTypeFilter}
                                    selectedOptions={[dataTypeFilter]}
                                    onOptionSelect={(_, data) => setDataTypeFilter(data.optionValue || 'all')}
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
                                    value={visitFilter === 'all' ? 'Visit assignment' : visitOptions.find(([eventOid]) => eventOid === visitFilter)?.[1] || 'Visit assignment'}
                                    selectedOptions={[visitFilter]}
                                    onOptionSelect={(_, data) => setVisitFilter(data.optionValue || 'all')}
                                >
                                    <Option value="all">Visit assignment</Option>
                                    {visitOptions.map(([eventOid, eventName]) => (
                                        <Option key={eventOid} value={eventOid}>
                                            {eventName}
                                        </Option>
                                    ))}
                                </Dropdown>
                            </div>
                            <div className={styles.resultsSummary}>
                                <Text className={styles.summaryText}>
                                    {hasActiveFilters
                                        ? `Showing ${filteredResults.length} of ${matrixEntries.length} matrix assignments`
                                        : `${matrixEntries.length} matrix assignments indexed`}
                                </Text>
                                {search.trim().length > 0 && <Text className={styles.summaryText}>{`Search: "${search.trim()}"`}</Text>}
                            </div>
                            {filteredResults.length > 0 ? (
                                <div className={styles.resultList}>
                                    {filteredResults.map(({ entry, matchedFields, previewItems, matchedItemCount }) => (
                                        <div key={entry.id} className={styles.resultCard}>
                                            <div className={styles.resultHeader}>
                                                <div>
                                                    <Text className={styles.resultTitle} block>
                                                        {renderHighlightedText(entry.formName, search, styles.matchHighlight)}
                                                    </Text>
                                                    <Text className={styles.summaryText} block>
                                                        {renderHighlightedText(entry.formOid, search, styles.matchHighlight)} · {renderHighlightedText(entry.eventName, search, styles.matchHighlight)}
                                                    </Text>
                                                </div>
                                                <div className={styles.resultMeta}>
                                                    <Badge appearance="tint" color="informative">{`${entry.itemCount} vars`}</Badge>
                                                    <Badge appearance="tint" color="success">{`${entry.requiredCount} required`}</Badge>
                                                    <Badge appearance="tint" color="warning">{`${entry.optionalCount} optional`}</Badge>
                                                </div>
                                            </div>
                                            {matchedFields.length > 0 && (
                                                <div className={styles.resultBadges}>
                                                    {matchedFields.map((field) => (
                                                        <Badge key={field} appearance="filled" color="brand">
                                                            {field}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            )}
                                            <Text className={styles.summaryText}>
                                                {matchedItemCount === entry.itemCount ? `${entry.itemCount} variables in assignment` : `${matchedItemCount} matching variables`}
                                            </Text>
                                            <div className={styles.previewList}>
                                                {previewItems.map((item) => (
                                                    <Text key={`${entry.id}:${item.itemOid}`} className={styles.previewText}>
                                                        {renderHighlightedText(item.itemOid, search, styles.matchHighlight)} — {renderHighlightedText(item.itemLabel, search, styles.matchHighlight)} ({item.dataType})
                                                    </Text>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className={styles.emptyState}>
                                    <Text block>No matrix assignments match the current search and filters.</Text>
                                    <Text block>Clear the search or adjust filters to restore the full matrix.</Text>
                                </div>
                            )}
                        </>
                    ) : (
                        <MessageBar className={styles.loadingHint}>
                            <MessageBarBody>Run “Validate Entire Study” once to load the latest matrix into memory for quick search and filtering.</MessageBarBody>
                        </MessageBar>
                    )}
                </div>
            </Card>
        </div>
    );
};
