import * as React from 'react';
import { useState, useEffect } from 'react';
import { Button, Input, Spinner, Badge, makeStyles, tokens, Text, Divider } from '@fluentui/react-components';
import { fetchDictionaries, insertDictionaryToActiveCell, saveNewDictionary, CodelistGroup } from '../../core/services/dictionary-service';

const useStyles = makeStyles({
    overlay: {
        position: 'absolute',
        inset: 0,
        backgroundColor: tokens.colorNeutralBackground1,
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: tokens.shadow64,
    },
    header: {
        padding: '14px 16px',
        backgroundColor: tokens.colorBrandBackground,
        color: tokens.colorNeutralForegroundOnBrand,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexShrink: 0,
    },
    headerLeft: {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
    },
    headerBadge: {
        marginBottom: '2px',
    },
    headerTitle: {
        fontSize: tokens.fontSizeBase500,
        fontWeight: tokens.fontWeightBold,
        color: tokens.colorNeutralForegroundOnBrand,
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
    },
    body: {
        flex: 1,
        padding: '16px',
        backgroundColor: tokens.colorNeutralBackground2,
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
        gap: '12px',
    },
    loadingBox: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
    },
    loadingText: {
        fontSize: tokens.fontSizeBase200,
        color: tokens.colorNeutralForeground3,
        fontWeight: tokens.fontWeightSemibold,
    },
    dictCard: {
        backgroundColor: tokens.colorNeutralBackground1,
        border: `1px solid ${tokens.colorNeutralStroke2}`,
        borderRadius: tokens.borderRadiusLarge,
        padding: '12px',
        boxShadow: tokens.shadow2,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        transition: 'border-color 0.15s',
    },
    dictCardHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
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
    },
    valueTag: {
        backgroundColor: tokens.colorNeutralBackground3,
        border: `1px solid ${tokens.colorNeutralStroke1}`,
        borderRadius: tokens.borderRadiusSmall,
        padding: '2px 6px',
        fontSize: tokens.fontSizeBase100,
        color: tokens.colorNeutralForeground2,
    },
    moreTag: {
        padding: '2px 6px',
        fontSize: tokens.fontSizeBase100,
        color: tokens.colorNeutralForeground3,
    },
    emptyText: {
        textAlign: 'center',
        padding: '16px',
        color: tokens.colorNeutralForeground3,
        fontSize: tokens.fontSizeBase200,
    },
    formCard: {
        backgroundColor: tokens.colorNeutralBackground1,
        border: `1px solid ${tokens.colorNeutralStroke2}`,
        borderRadius: tokens.borderRadiusLarge,
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    },
    fieldLabel: {
        display: 'block',
        fontSize: tokens.fontSizeBase100,
        fontWeight: tokens.fontWeightSemibold,
        color: tokens.colorNeutralForeground2,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        marginBottom: '4px',
    },
    itemRow: {
        display: 'flex',
        gap: '8px',
        alignItems: 'center',
    },
    addRowBtn: {
        fontSize: tokens.fontSizeBase200,
        color: tokens.colorBrandForeground1,
        fontWeight: tokens.fontWeightSemibold,
        cursor: 'pointer',
        background: 'none',
        border: 'none',
        padding: 0,
        ':hover': {
            color: tokens.colorBrandForeground2,
        },
    },
    backBtn: {
        fontSize: tokens.fontSizeBase200,
        color: tokens.colorNeutralForeground3,
        fontWeight: tokens.fontWeightSemibold,
        cursor: 'pointer',
        background: 'none',
        border: 'none',
        padding: 0,
        ':hover': {
            color: tokens.colorNeutralForeground1,
        },
    },
    saveBtn: {
        width: '100%',
        justifyContent: 'center',
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

    const handleUseDictionary = async (id: string) => {
        await insertDictionaryToActiveCell(id);
    };

    const handleSaveNew = async () => {
        if (!newId || newItems.some(i => !i.codedValue)) return;
        setView('loading');
        await saveNewDictionary(newId, newName, newItems);
        setNewId(''); setNewName(''); setNewItems([{ codedValue: '', decode: '' }]);
        await loadData();
    };

    const filteredDicts = dictionaries.filter(d =>
        d.id.toLowerCase().includes(search.toLowerCase()) ||
        d.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className={styles.overlay}>
            {/* Header */}
            <div className={styles.header}>
                <div className={styles.headerLeft}>
                    <div className={styles.headerBadge}>
                        <Badge appearance="tint" color="success" size="small">Active Context</Badge>
                    </div>
                    <span className={styles.headerTitle}>📚 Codelist Library</span>
                </div>
                {view === 'browse' && (
                    <Button
                        appearance="outline"
                        size="small"
                        onClick={() => setView('create')}
                    >
                        + New
                    </Button>
                )}
            </div>

            {/* Body */}
            <div className={styles.body}>
                {view === 'loading' && (
                    <div className={styles.loadingBox}>
                        <Spinner size="medium" />
                        <Text className={styles.loadingText}>Syncing Library...</Text>
                    </div>
                )}

                {view === 'browse' && (
                    <>
                        <Input
                            placeholder="Search dictionaries..."
                            value={search}
                            onChange={(_, d) => setSearch(d.value)}
                        />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {filteredDicts.map(dict => (
                                <div key={dict.id} className={styles.dictCard}>
                                    <div className={styles.dictCardHeader}>
                                        <div>
                                            <Text className={styles.dictId}>{dict.id}</Text>
                                            <Text className={styles.dictName}>{dict.name}</Text>
                                        </div>
                                        <Button
                                            appearance="subtle"
                                            size="small"
                                            onClick={() => handleUseDictionary(dict.id)}
                                        >
                                            Use
                                        </Button>
                                    </div>
                                    <div className={styles.tagRow}>
                                        {dict.items.slice(0, 4).map((item, idx) => (
                                            <span key={idx} className={styles.valueTag}>
                                                {item.codedValue} = {item.decode}
                                            </span>
                                        ))}
                                        {dict.items.length > 4 && (
                                            <span className={styles.moreTag}>+{dict.items.length - 4} more</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {filteredDicts.length === 0 && (
                                <Text className={styles.emptyText}>No dictionaries found.</Text>
                            )}
                        </div>
                    </>
                )}

                {view === 'create' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <button className={styles.backBtn} onClick={() => setView('browse')}>
                            ← Back to Browse
                        </button>

                        <div className={styles.formCard}>
                            <div>
                                <label className={styles.fieldLabel}>Codelist ID</label>
                                <Input
                                    value={newId}
                                    onChange={(_, d) => setNewId(d.value.toUpperCase())}
                                    placeholder="e.g. SEV_DICT"
                                />
                            </div>
                            <div>
                                <label className={styles.fieldLabel}>Display Name</label>
                                <Input
                                    value={newName}
                                    onChange={(_, d) => setNewName(d.value)}
                                    placeholder="e.g. Severity Scale"
                                />
                            </div>

                            <Divider />

                            <div>
                                <label className={styles.fieldLabel}>Values &amp; Decodes</label>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    {newItems.map((item, idx) => (
                                        <div key={idx} className={styles.itemRow}>
                                            <Input
                                                placeholder="Value"
                                                value={item.codedValue}
                                                style={{ width: '90px', flexShrink: 0 }}
                                                onChange={(_, d) => {
                                                    const updated = [...newItems];
                                                    updated[idx].codedValue = d.value;
                                                    setNewItems(updated);
                                                }}
                                            />
                                            <Input
                                                placeholder="Decode"
                                                value={item.decode}
                                                style={{ flex: 1 }}
                                                onChange={(_, d) => {
                                                    const updated = [...newItems];
                                                    updated[idx].decode = d.value;
                                                    setNewItems(updated);
                                                }}
                                            />
                                        </div>
                                    ))}
                                    <button
                                        className={styles.addRowBtn}
                                        onClick={() => setNewItems([...newItems, { codedValue: '', decode: '' }])}
                                    >
                                        + Add Row
                                    </button>
                                </div>
                            </div>
                        </div>

                        <Button
                            appearance="primary"
                            className={styles.saveBtn}
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
