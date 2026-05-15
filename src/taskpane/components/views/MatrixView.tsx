import * as React from 'react';
import { Button, makeStyles, tokens, Text, Divider } from '@fluentui/react-components';
import { Spinner } from '@fluentui/react-components';

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
        padding: '16px',
        border: `1px solid ${tokens.colorNeutralStroke2}`,
        boxShadow: tokens.shadow4,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    },
    titleRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
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
    titleCol: {
        display: 'flex',
        flexDirection: 'column',
    },
    title: {
        fontSize: tokens.fontSizeBase300,
        fontWeight: tokens.fontWeightBold,
        color: tokens.colorNeutralForeground1,
    },
    subtitle: {
        fontSize: tokens.fontSizeBase100,
        color: tokens.colorNeutralForeground3,
    },
    analyzeBtn: {
        width: '100%',
        justifyContent: 'center',
    },
    exportGrid: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '10px',
    },
    exportBtn: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px',
        padding: '12px 0',
        height: 'auto',
        minHeight: '64px',
    },
    exportIcon: {
        fontSize: '22px',
        lineHeight: '1',
    },
    errorBanner: {
        backgroundColor: tokens.colorPaletteRedBackground1,
        border: `1px solid ${tokens.colorPaletteRedBorder2}`,
        borderRadius: tokens.borderRadiusMedium,
        padding: '10px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        alignItems: 'center',
    },
    errorText: {
        fontSize: tokens.fontSizeBase200,
        fontWeight: tokens.fontWeightBold,
        color: tokens.colorPaletteRedForeground1,
        textAlign: 'center',
    },
    errorSubText: {
        fontSize: tokens.fontSizeBase100,
        color: tokens.colorPaletteRedForeground2,
        textAlign: 'center',
    },
    awaitingText: {
        fontSize: tokens.fontSizeBase100,
        color: tokens.colorNeutralForeground3,
        textAlign: 'center',
        fontWeight: tokens.fontWeightSemibold,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        marginTop: '4px',
    },
});

export const MatrixView: React.FC<MatrixProps> = ({ onAnalyze, onDocx, onOdm, isProcessing, hasErrors, isLoaded }) => {
    const styles = useStyles();

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <div className={styles.titleRow}>
                    <div className={styles.iconBox}>📅</div>
                    <div className={styles.titleCol}>
                        <Text className={styles.title}>Visit Matrix</Text>
                        <Text className={styles.subtitle}>Schedule &amp; Export</Text>
                    </div>
                </div>

                <Button
                    appearance="primary"
                    className={styles.analyzeBtn}
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
                        className={styles.exportBtn}
                        onClick={onDocx}
                        disabled={isProcessing || hasErrors || !isLoaded}
                    >
                        <span className={styles.exportIcon}>📄</span>
                        <span>Paper CRF</span>
                    </Button>
                    <Button
                        appearance="outline"
                        className={styles.exportBtn}
                        onClick={onOdm}
                        disabled={isProcessing || hasErrors || !isLoaded}
                    >
                        <span className={styles.exportIcon}>⚛️</span>
                        <span>ODM XML</span>
                    </Button>
                </div>

                {hasErrors && (
                    <div className={styles.errorBanner}>
                        <Text className={styles.errorText}>⚠️ Critical Errors Detected</Text>
                        <Text className={styles.errorSubText}>
                            Resolve highlighted issues in Excel to unlock export.
                        </Text>
                    </div>
                )}

                {!isLoaded && !hasErrors && (
                    <Text className={styles.awaitingText}>Awaiting Analysis</Text>
                )}
            </div>
        </div>
    );
};
