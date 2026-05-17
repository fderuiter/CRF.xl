import * as React from 'react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Button,
    Input,
    Spinner,
    Badge,
    Text,
    makeStyles,
    tokens,
    Divider,
} from '@fluentui/react-components';
import { AddRegular, ArrowLeftRegular } from '@fluentui/react-icons';
import { fetchDictionaries, insertDictionaryToActiveCell, saveNewDictionary, CodelistGroup } from '../../core/services/dictionary-service';
import { filterDictionaries, getDictionaryPreview } from './dictionary-sidecar-utils';

const useStyles = makeStyles({
    root: {
        position: 'absolute',
        inset: 0,
        backgroundColor: tokens.colorNeutralBackground1,
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: tokens.shadow64,
    },
    header: {
        padding: '16px',
        backgroundColor: tokens.colorBrandBackground,
        color: tokens.colorNeutralForegroundOnBrand,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexShrink: 0,
    },
    headerBadge: {
        marginBottom: '6px',
    },
    headerTitle: {
        fontSize: tokens.fontSizeBase500,
        fontWeight: tokens.fontWeightBold,
        color: tokens.colorNeutralForegroundOnBrand,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    },
    body: {
        flexGrow: 1,
        padding: '16px',
        backgroundColor: tokens.colorNeutralBackground3,
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
        gap: '12px',
    },
    loadingState: {
        flexGrow: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
    },
    searchInput: {
        width: '100%',
    },
    resultsSummary: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '8px',
    },
    gridCardContainer: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    },
    dictCard: {
        backgroundColor: tokens.colorNeutralBackground1,
        borderRadius: tokens.borderRadiusMedium,
        padding: '12px',
        boxShadow: tokens.shadow2,
        border: `1px solid ${tokens.colorNeutralStroke1}`,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    dictCardHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '8px',
    },
    gridCellStack: {
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
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
        display: 'flex',
        flexWrap: 'wrap',
        gap: '4px',
        alignItems: 'center',
    },
    tag: {
        fontSize: tokens.fontSizeBase100,
        color: tokens.colorNeutralForeground3,
        backgroundColor: tokens.colorNeutralBackground3,
        borderRadius: tokens.borderRadiusSmall,
        padding: '2px 6px',
        border: `1px solid ${tokens.colorNeutralStroke1}`,
    },
    emptyText: {
        textAlign: 'center',
        color: tokens.colorNeutralForeground3,
        padding: '24px 0',
    },
    actionCell: {
        display: 'flex',
        justifyContent: 'flex-end',
    },
    createForm: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    },
    formCard: {
        backgroundColor: tokens.colorNeutralBackground1,
        borderRadius: tokens.borderRadiusMedium,
        padding: '16px',
        boxShadow: tokens.shadow2,
        border: `1px solid ${tokens.colorNeutralStroke1}`,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
    },
    fieldLabel: {
        fontSize: tokens.fontSizeBase100,
        fontWeight: tokens.fontWeightSemibold,
        color: tokens.colorNeutralForeground3,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        display: 'block',
        marginBottom: '4px',
    },
    valueRow: {
        display: 'flex',
        gap: '8px',
    },
    valueInput: {
        flexGrow: 1,
    },
    saveButton: {
        width: '100%',
    },
});

export const DictionarySidecar: React.FC = () => {
    const styles = useStyles();
    const [view, setView] = useState<'loading' | 'browse' | 'create'>('loading');
    const [dictionaries, setDictionaries] = useState<CodelistGroup[]>([]);
    const [search, setSearch] = useState('');

    const [newId, setNewId] = useState('');
    const [newName, setNewName] = useState('');
    const [newItems, setNewItems] = useState([{ codedValue: '', decode: '' }]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setView('loading');
        const data = await fetchDictionaries();
        setDictionaries(data);
        setView('browse');
    };

    const handleUseDictionary = useCallback(async (id: string) => {
        await insertDictionaryToActiveCell(id);
    }, []);

    const handleSaveNew = async () => {
        if (!newId || newItems.some(i => !i.codedValue)) return;
        setView('loading');
        await saveNewDictionary(newId, newName, newItems);
        setNewId(''); setNewName(''); setNewItems([{ codedValue: '', decode: '' }]);
        await loadData();
    };

    const filteredDicts = useMemo(() => filterDictionaries(dictionaries, search), [dictionaries, search]);
    const hasSearch = search.trim().length > 0;
    const resultSummary = hasSearch
        ? `Showing ${filteredDicts.length} of ${dictionaries.length} codelists`
        : `${dictionaries.length} codelists available`;


    return (
        <div className={styles.root}>
            <div className={styles.header}>
                <div>
                    <div className={styles.headerBadge}>
                        <Badge appearance="tint" color="success">Active Context</Badge>
                    </div>
                    <Text className={styles.headerTitle} block>
                        <span>📚</span> Codelist Library
                    </Text>
                </div>
                {view === 'browse' && (
                    <Button
                        appearance="secondary"
                        size="small"
                        icon={<AddRegular />}
                        onClick={() => setView('create')}
                    >
                        New
                    </Button>
                )}
            </div>

            <div className={styles.body}>
                {view === 'loading' && (
                    <div className={styles.loadingState}>
                        <Spinner size="medium" label="Syncing Library..." />
                    </div>
                )}

                {view === 'browse' && (
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
                            <div className={styles.gridCardContainer}>
                                {filteredDicts.map((item) => {
                                    const preview = getDictionaryPreview(item.items);
                                    return (
                                        <div key={item.id} className={styles.dictCard}>
                                            <div className={styles.dictCardHeader}>
                                                <div className={styles.gridCellStack}>
                                                    <Text className={styles.dictId} block>
                                                        {item.id}
                                                    </Text>
                                                    <Text className={styles.dictName} block>
                                                        {item.name || '—'}
                                                    </Text>
                                                </div>
                                                <Button appearance="outline" size="small" onClick={() => handleUseDictionary(item.id)}>
                                                    Use
                                                </Button>
                                            </div>
                                            <div className={styles.tagRow}>
                                                <Badge appearance="outline" color="brand">{item.items.length} values</Badge>
                                                {preview.previewItems.map((entry) => (
                                                    <span key={entry} className={styles.tag}>
                                                        {entry}
                                                    </span>
                                                ))}
                                                {preview.overflowCount > 0 && <span className={styles.tag}>+{preview.overflowCount} more</span>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <Text className={styles.emptyText}>
                                {dictionaries.length === 0 ? 'No codelists available yet.' : 'No codelists found for the current search.'}
                            </Text>
                        )}
                    </>
                )}

                {view === 'create' && (
                    <div className={styles.createForm}>
                        <Button
                            appearance="subtle"
                            size="small"
                            icon={<ArrowLeftRegular />}
                            onClick={() => setView('browse')}
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
                                    style={{ width: '100%', textTransform: 'uppercase' }}
                                />
                            </div>
                            <div>
                                <label className={styles.fieldLabel}>Display Name</label>
                                <Input
                                    value={newName}
                                    onChange={(_, d) => setNewName(d.value)}
                                    placeholder="e.g. Severity Scale"
                                    style={{ width: '100%' }}
                                />
                            </div>

                            <Divider />

                            <div>
                                <label className={styles.fieldLabel}>Values &amp; Decodes</label>
                                {newItems.map((item, idx) => (
                                    <div key={idx} className={styles.valueRow} style={{ marginBottom: '8px' }}>
                                        <Input
                                            placeholder="Value (e.g. 1)"
                                            value={item.codedValue}
                                            onChange={(_, d) => {
                                                const updated = [...newItems];
                                                updated[idx].codedValue = d.value;
                                                setNewItems(updated);
                                            }}
                                            style={{ width: '33%' }}
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
                                    onClick={() => setNewItems([...newItems, { codedValue: '', decode: '' }])}
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
            </div>
        </div>
    );
};
