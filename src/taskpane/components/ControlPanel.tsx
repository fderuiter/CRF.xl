import * as React from 'react';
import { Button, makeStyles, tokens, Text, Divider } from '@fluentui/react-components';
import { Spinner } from '@fluentui/react-components';

interface ControlPanelProps {
    onInit: () => Promise<void>;
    onDocx: () => Promise<void>;
    onOdm: () => Promise<void>;
    onAnalyze: () => Promise<any>;
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
    buttonCol: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    fullWidthBtn: {
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
        height: 'auto',
        minHeight: '60px',
        padding: '10px 0',
    },
    exportIcon: {
        fontSize: '20px',
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

/**
 * ControlPanel: The primary action hub for clinical designers.
 * Refactored to consume Fluent UI v9 components.
 */
export const ControlPanel: React.FC<ControlPanelProps> = ({
    onInit, onDocx, onOdm, onAnalyze, isProcessing, hasErrors, isLoaded
}) => {
    const styles = useStyles();

    return (
        <div className={styles.container}>
            <div className={styles.buttonCol}>
                <Button
                    appearance="secondary"
                    className={styles.fullWidthBtn}
                    onClick={onInit}
                    disabled={isProcessing}
                    icon={isProcessing ? <Spinner size="tiny" /> : <span>✨</span>}
                >
                    Initialize Workbook
                </Button>

                <Button
                    appearance="primary"
                    className={styles.fullWidthBtn}
                    onClick={onAnalyze}
                    disabled={isProcessing}
                    icon={isProcessing ? <Spinner size="tiny" /> : <span>🔍</span>}
                >
                    {isProcessing ? 'Analyzing Metadata...' : 'Run Workbook Analysis'}
                </Button>
            </div>

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
                        Resolve highlighted issues in Excel to unlock export capabilities.
                    </Text>
                </div>
            )}

            {!isLoaded && !hasErrors && (
                <Text className={styles.awaitingText}>Awaiting Analysis</Text>
            )}
        </div>
    );
};
