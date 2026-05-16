import * as React from 'react';
import {
    Badge,
    Body1,
    Button,
    Card,
    Divider,
    Dropdown,
    Input,
    Spinner,
    Text,
    makeStyles,
    tokens,
    MessageBar,
    MessageBarBody,
    Option,
} from '@fluentui/react-components';
import { StudyDesign } from '../../core/types';
import { buildMatrixSearchIndex, filterMatrixSearchIndex, MatrixRequiredFilter } from './matrix-view-utils';

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
        gap: '10px',
    },
    searchHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '8px',
        flexWrap: 'wrap',
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
        width: '100%',
    },
    filterGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
        gap: '8px',
    },
    filterControl: {
        minWidth: 0,
    },
    summaryRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '8px',
        flexWrap: 'wrap',
    },
    summaryText: {
        color: tokens.colorNeutralForeground3,
    },
    resultList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        maxHeight: '280px',
        overflowY: 'auto',
        paddingRight: '4px',
    },
    resultItem: {
        backgroundColor: tokens.colorNeutralBackground2,
        borderRadius: tokens.borderRadiusLarge,
        borderLeft: `4px solid ${tokens.colorBrandStroke1}`,
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
    },
    resultTopRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '8px',
        flexWrap: 'wrap',
    },
    resultTitle: {
        fontWeight: tokens.fontWeightSemibold,
        color: tokens.colorNeutralForeground1,
    },
    resultMeta: {
        color: tokens.colorNeutralForeground2,
    },
    badgeRow: {
        display: 'flex',
        gap: '6px',
        flexWrap: 'wrap',
    },
    previewText: {
        color: tokens.colorNeutralForeground2,
    },
    emptyState: {
        backgroundColor: tokens.colorNeutralBackground2,
        borderRadius: tokens.borderRadiusLarge,
        border: `1px dashed ${tokens.colorNeutralStroke2}`,
        padding: '16px',
        textAlign: 'center',
        color: tokens.colorNeutralForeground3,
    },
});

const SEARCH_DEBOUNCE_MS = 150;

export const MatrixView: React.FC<MatrixProps> = ({ onAnalyze, onDocx, onOdm, isProcessing, hasErrors, isLoaded, study }) => {
    const styles = useStyles();
    const [search, setSearch] = React.useState('');
    const [debouncedSearch, setDebouncedSearch] = React.useState('');
    const [requiredFilter, setRequiredFilter] = React.useState<MatrixRequiredFilter>('all');
    const [dataTypeFilter, setDataTypeFilter] = React.useState('all');
    const [visitFilter, setVisitFilter] = React.useState('all');

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
        () => Array.from(new Map(matrixIndex.map((entry) => [entry.eventOid, entry.eventName])).entries()),
        [matrixIndex]
    );
    const dataTypeOptions = React.useMemo(
        () => Array.from(new Set(matrixIndex.flatMap((entry) => entry.dataTypes))).sort((left, right) => left.localeCompare(right)),
        [matrixIndex]
    );
    const hasActiveFilters = search.trim().length > 0 || requiredFilter !== 'all' || dataTypeFilter !== 'all' || visitFilter !== 'all';

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
                            <div className={styles.summaryRow}>
                                <Text className={styles.summaryText}>
                                    {hasActiveFilters
                                        ? `Showing ${filteredEntries.length} of ${matrixIndex.length} matrix assignments`
                                        : `${matrixIndex.length} matrix assignments indexed`}
                                </Text>
                                {search.trim().length > 0 && <Text className={styles.summaryText}>{`Search: "${search.trim()}"`}</Text>}
                            </div>
                            {filteredEntries.length > 0 ? (
                                <div className={styles.resultList}>
                                    {filteredEntries.map((entry) => (
                                        <div key={entry.id} className={styles.resultItem}>
                                            <div className={styles.resultTopRow}>
                                                <div>
                                                    <Text className={styles.resultTitle} block>{entry.formName}</Text>
                                                    <Text className={styles.resultMeta} block>{`${entry.formOid} · ${entry.eventName}`}</Text>
                                                </div>
                                                <Badge appearance="tint" color="brand">{`${entry.itemCount} vars`}</Badge>
                                            </div>
                                            <div className={styles.badgeRow}>
                                                <Badge appearance="outline" color="success">{`${entry.requiredCount} required`}</Badge>
                                                <Badge appearance="outline" color="warning">{`${entry.optionalCount} optional`}</Badge>
                                            </div>
                                            <Text className={styles.previewText}>{entry.previewItems.join(' • ')}</Text>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className={styles.emptyState}>
                                    <Text block>No matrix assignments match the current search and filters.</Text>
                                    <Text block>Clear the search or adjust the filters to restore the full matrix.</Text>
                                </div>
                            )}
                        </>
                    ) : (
                        <MessageBar>
                            <MessageBarBody>Run “Validate Entire Study” to load the latest matrix into memory for quick search.</MessageBarBody>
                        </MessageBar>
                    )}
                </div>
            </Card>
        </div>
    );
};
