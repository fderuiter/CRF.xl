import * as React from 'react';
import { Button, makeStyles, tokens, Text } from '@fluentui/react-components';
import { Spinner } from '@fluentui/react-components';

interface RegistryProps {
    onInit: () => Promise<void>;
    onSync: () => Promise<void>;
    isProcessing: boolean;
    isWelcome?: boolean;
}

const useStyles = makeStyles({
    container: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    },
    heroCard: {
        backgroundColor: tokens.colorNeutralBackgroundInverted,
        borderRadius: tokens.borderRadiusXLarge,
        padding: '20px',
        color: tokens.colorNeutralForegroundInverted,
        boxShadow: tokens.shadow8,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        position: 'relative',
        overflow: 'hidden',
    },
    heroTitle: {
        fontSize: tokens.fontSizeBase500,
        fontWeight: tokens.fontWeightBold,
        color: tokens.colorNeutralForegroundInverted,
        lineHeight: '1.2',
    },
    heroDescription: {
        fontSize: tokens.fontSizeBase200,
        color: tokens.colorNeutralForegroundInvertedLink,
        lineHeight: '1.5',
        marginBottom: '8px',
    },
    buttonRow: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    fullWidthBtn: {
        width: '100%',
        justifyContent: 'center',
    },
});

export const RegistryView: React.FC<RegistryProps> = ({ onInit, onSync, isProcessing, isWelcome }) => {
    const styles = useStyles();

    return (
        <div className={styles.container}>
            <div className={styles.heroCard}>
                <Text className={styles.heroTitle}>
                    {isWelcome ? 'Welcome to CRF.xl' : '🏛️ System Registry'}
                </Text>
                <Text className={styles.heroDescription}>
                    {isWelcome
                        ? 'Starting a new project on a blank canvas. Initialize the Matrix Architecture to set up your clinical study.'
                        : 'Define your global protocol and register your forms here. Sync to generate authoring tabs.'}
                </Text>
                <div className={styles.buttonRow}>
                    <Button
                        appearance="outline"
                        className={styles.fullWidthBtn}
                        onClick={onInit}
                        disabled={isProcessing}
                        icon={isProcessing ? <Spinner size="tiny" /> : undefined}
                    >
                        ✨ Initialize Canvas
                    </Button>
                    {!isWelcome && (
                        <Button
                            appearance="primary"
                            className={styles.fullWidthBtn}
                            onClick={onSync}
                            disabled={isProcessing}
                            icon={isProcessing ? <Spinner size="tiny" /> : undefined}
                        >
                            🔄 Sync Form Sheets
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
};
