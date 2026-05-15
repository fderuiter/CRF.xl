import * as React from 'react';
import { Button, Spinner, Divider, makeStyles, tokens, Text, MessageBar, MessageBarBody } from '@fluentui/react-components';

interface MatrixProps {
    onAnalyze: () => Promise<any>;
    onDocx: () => Promise<void>;
    onOdm: () => Promise<void>;
    isProcessing: boolean;
    hasErrors: boolean;
    isLoaded: boolean;
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
});

export const MatrixView: React.FC<MatrixProps> = ({ onAnalyze, onDocx, onOdm, isProcessing, hasErrors, isLoaded }) => {
    const styles = useStyles();
    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <div className={styles.cardHeader}>
                    <div className={styles.iconBox}>📅</div>
                    <div>
                        <Text className={styles.cardTitle} block>Visit Matrix</Text>
                        <Text className={styles.cardSubtitle}>Schedule &amp; Export</Text>
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
            </div>
        </div>
    );
};
