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
import {
    ArrowRightRegular,
    SearchRegular,
    WarningRegular,
    ErrorCircleRegular,
    CheckmarkCircleRegular,
} from '@fluentui/react-icons';
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
    onNavigate?: (sheetName: string, rowIndex: number) => void;
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
    depMapSection: {
        marginTop: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    },
    depMapTitle: {
        fontSize: tokens.fontSizeBase300,
        fontWeight: tokens.fontWeightBold,
        color: tokens.colorNeutralForeground1,
    },
    depMapFormGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        backgroundColor: tokens.colorNeutralBackground2,
        borderRadius: tokens.borderRadiusLarge,
        padding: '12px',
        border: `1px solid ${tokens.colorNeutralStroke2}`,
    },
    depMapFormHeader: {
        fontWeight: tokens.fontWeightBold,
        fontSize: tokens.fontSizeBase100,
        color: tokens.colorNeutralForeground3,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        borderBottom: `1px solid ${tokens.colorNeutralStroke3}`,
        paddingBottom: '4px',
        marginBottom: '4px',
    },
    depItem: {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        padding: '10px 12px',
        backgroundColor: tokens.colorNeutralBackground1,
        border: `1px solid ${tokens.colorNeutralStroke1}`,
        borderRadius: tokens.borderRadiusMedium,
        cursor: 'pointer',
        transition: 'all 0.15s ease-in-out',
        outline: 'none',
        ':hover': {
            backgroundColor: tokens.colorNeutralBackground1Hover,
            borderColor: tokens.colorBrandStroke1,
        },
        ':focus-visible': {
            outline: `2px solid ${tokens.colorBrandStroke1}`,
            borderColor: tokens.colorBrandStroke1,
        },
    },
    depItemActive: {
        borderColor: tokens.colorBrandStroke1,
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
    depItemHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '8px',
    },
    depItemTitle: {
        fontWeight: tokens.fontWeightSemibold,
        fontSize: tokens.fontSizeBase200,
    },
    depItemRelation: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        flexWrap: 'wrap',
        fontSize: tokens.fontSizeBase100,
        color: tokens.colorNeutralForeground2,
    },
    depItemExpression: {
        fontFamily: 'monospace',
        fontSize: tokens.fontSizeBase100,
        backgroundColor: tokens.colorNeutralBackground3,
        padding: '2px 6px',
        borderRadius: tokens.borderRadiusSmall,
        wordBreak: 'break-all',
    },
    detailPanel: {
        backgroundColor: tokens.colorNeutralBackground1,
        border: `1px solid ${tokens.colorBrandStroke1}`,
        borderRadius: tokens.borderRadiusLarge,
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        marginTop: '8px',
        boxShadow: tokens.shadow4,
    },
    detailHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    detailTitle: {
        fontSize: tokens.fontSizeBase200,
        fontWeight: tokens.fontWeightBold,
    },
    detailMetaGrid: {
        display: 'grid',
        gridTemplateColumns: '80px 1fr',
        rowGap: '6px',
        columnGap: '12px',
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
        display: 'flex',
        gap: '8px',
        marginTop: '4px',
    },
});

const SEARCH_DEBOUNCE_MS = 150;

export const MatrixView: React.FC<MatrixProps> = ({ onAnalyze, onDocx, onOdm, isProcessing, hasErrors, isLoaded, study, onNavigate }) => {
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

    // Group cross-form dependencies by their sourceFormOid
    const dependenciesByForm = React.useMemo(() => {
        if (!study || !study.crossFormDependencies) return {};
        const groups: { [key: string]: any[] } = {};
        study.crossFormDependencies.forEach(dep => {
            const form = dep.sourceFormOid || 'Unknown';
            if (!groups[form]) {
                groups[form] = [];
            }
            groups[form].push(dep);
        });
        return groups;
    }, [study]);

    const hasDeps = study?.crossFormDependencies && study.crossFormDependencies.length > 0;
    const [selectedDepId, setSelectedDepId] = React.useState<string | null>(null);

    // Keyboard navigation helper
    const handleDepKeyDown = (e: React.KeyboardEvent, depId: string) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setSelectedDepId(prev => (prev === depId ? null : depId));
        }
    };

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

            {hasDeps && (
                <Card className={styles.card}>
                    <div className={styles.cardHeader}>
                        <div className={styles.iconBox}>🔗</div>
                        <div style={{ flexGrow: 1 }}>
                            <Body1 className={styles.cardTitle}>Cross-Form Dependency Map</Body1>
                            <Body1 className={styles.cardSubtitle}>Traces rule-linked variables across forms</Body1>
                        </div>
                        <div className={styles.badgeRow}>
                            {study.crossFormDependencies!.filter(d => d.severity === 'Error').length > 0 && (
                                <Badge color="danger" appearance="tint">
                                    {study.crossFormDependencies!.filter(d => d.severity === 'Error').length} Errors
                                </Badge>
                            )}
                            {study.crossFormDependencies!.filter(d => d.severity === 'Warning').length > 0 && (
                                <Badge color="warning" appearance="tint">
                                    {study.crossFormDependencies!.filter(d => d.severity === 'Warning').length} Warnings
                                </Badge>
                            )}
                        </div>
                    </div>

                    <Divider />

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '12px' }}>
                        {Object.entries(dependenciesByForm).map(([formOid, deps]) => (
                            <div key={formOid} className={styles.depMapFormGroup}>
                                <div className={styles.depMapFormHeader}>
                                    Form: {formOid}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {deps.map((dep) => {
                                        const isSelected = selectedDepId === dep.id;
                                        const severityClass = 
                                            dep.severity === 'Error' ? styles.depItemError :
                                            dep.severity === 'Warning' ? styles.depItemWarning :
                                            styles.depItemOk;

                                        return (
                                            <div key={dep.id} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                <div
                                                    className={`${styles.depItem} ${severityClass} ${isSelected ? styles.depItemActive : ''}`}
                                                    onClick={() => setSelectedDepId(isSelected ? null : dep.id)}
                                                    onKeyDown={(e) => handleDepKeyDown(e, dep.id)}
                                                    tabIndex={0}
                                                    role="button"
                                                    aria-expanded={isSelected}
                                                    aria-label={`Dependency from ${dep.sourceOid} to ${dep.targetOid} in form ${dep.targetFormOid}. Severity ${dep.severity}. Click for details.`}
                                                >
                                                    <div className={styles.depItemHeader}>
                                                        <div className={styles.depItemTitle}>
                                                            {dep.sourceOid}
                                                        </div>
                                                        <div className={styles.badgeRow}>
                                                            <Badge appearance="tint" color="brand">{dep.dependencyType}</Badge>
                                                            {dep.status !== 'Valid' && (
                                                                <Badge appearance="filled" color={dep.severity === 'Error' ? 'danger' : 'warning'}>
                                                                    {dep.status}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className={styles.depItemRelation}>
                                                        <span>{dep.sourceType}</span>
                                                        <ArrowRightRegular style={{ fontSize: '12px' }} />
                                                        <span>
                                                            {dep.targetFormOid !== 'Unknown' ? `${dep.targetFormOid}.${dep.targetOid}` : dep.targetOid}
                                                        </span>
                                                        <span style={{ fontSize: '11px', opacity: 0.7 }}>
                                                            ({dep.targetType})
                                                        </span>
                                                    </div>
                                                    <div className={styles.depItemExpression}>
                                                        {dep.expression}
                                                    </div>
                                                </div>

                                                {isSelected && (
                                                    <div className={styles.detailPanel}>
                                                        <div className={styles.detailHeader}>
                                                            <Text className={styles.detailTitle} block>Dependency Details</Text>
                                                            {dep.severity === 'Error' ? (
                                                                <Badge color="danger" icon={<ErrorCircleRegular />}>Error</Badge>
                                                            ) : dep.severity === 'Warning' ? (
                                                                <Badge color="warning" icon={<WarningRegular />}>Warning</Badge>
                                                            ) : (
                                                                <Badge color="success" icon={<CheckmarkCircleRegular />}>Valid</Badge>
                                                            )}
                                                        </div>

                                                        <Divider />

                                                        <div className={styles.detailMetaGrid}>
                                                            <span className={styles.detailMetaLabel}>Status:</span>
                                                            <span className={styles.detailMetaVal}>{dep.status}</span>

                                                            <span className={styles.detailMetaLabel}>Expression:</span>
                                                            <code style={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>{dep.expression}</code>

                                                            <span className={styles.detailMetaLabel}>Description:</span>
                                                            <span className={styles.detailMetaVal}>{dep.message}</span>
                                                        </div>

                                                        <div className={styles.detailActionRow}>
                                                            {onNavigate && dep.sourceRowIndex !== undefined && (
                                                                <Button
                                                                    size="small"
                                                                    appearance="primary"
                                                                    icon={<SearchRegular />}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        onNavigate(dep.sourceFormOid, dep.sourceRowIndex);
                                                                    }}
                                                                >
                                                                    Go to Source ({dep.sourceFormOid} row {dep.sourceRowIndex + 1})
                                                                </Button>
                                                            )}

                                                            {onNavigate && dep.targetRowIndex !== undefined && dep.targetFormOid !== 'Unknown' && (
                                                                <Button
                                                                    size="small"
                                                                    appearance="secondary"
                                                                    icon={<SearchRegular />}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        onNavigate(dep.targetFormOid, dep.targetRowIndex);
                                                                    }}
                                                                >
                                                                    Go to Target ({dep.targetFormOid} row {dep.targetRowIndex + 1})
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            )}
        </div>
    );
};
