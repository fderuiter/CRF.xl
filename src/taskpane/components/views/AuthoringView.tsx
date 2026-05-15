import * as React from 'react';
import { Button, makeStyles, tokens, Text, Divider } from '@fluentui/react-components';
import { Spinner } from '@fluentui/react-components';
import { insertDateBlock, insertAEBlock } from '../../core/services/authoring-service';

interface AuthoringProps {
    sheetName: string;
    onValidate: () => void;
    isProcessing: boolean;
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
        gap: '8px',
    },
    title: {
        fontSize: tokens.fontSizeBase400,
        fontWeight: tokens.fontWeightBold,
        color: tokens.colorBrandForeground1,
        lineHeight: '1.2',
    },
    subtitle: {
        fontSize: tokens.fontSizeBase200,
        color: tokens.colorNeutralForeground2,
    },
    buttonGrid: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    actionBtn: {
        width: '100%',
        justifyContent: 'flex-start',
    },
    validateBtn: {
        width: '100%',
        justifyContent: 'center',
    },
});

export const AuthoringView: React.FC<AuthoringProps> = ({ sheetName, onValidate, isProcessing }) => {
    const styles = useStyles();

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <div className={styles.titleRow}>
                    <span>📝</span>
                    <Text className={styles.title}>Authoring: {sheetName}</Text>
                </div>
                <Text className={styles.subtitle}>Context-aware tools for this form.</Text>

                <div className={styles.buttonGrid}>
                    <Button
                        appearance="outline"
                        className={styles.actionBtn}
                        onClick={insertDateBlock}
                        icon={<span>📅</span>}
                    >
                        Insert Date Group
                    </Button>
                    <Button
                        appearance="outline"
                        className={styles.actionBtn}
                        onClick={insertAEBlock}
                        icon={<span>⚠️</span>}
                    >
                        Insert AE Block
                    </Button>
                </div>
            </div>

            <Divider />

            <Button
                appearance="primary"
                className={styles.validateBtn}
                onClick={onValidate}
                disabled={isProcessing}
                icon={isProcessing ? <Spinner size="tiny" /> : <span>🔍</span>}
            >
                Validate {sheetName}
            </Button>
        </div>
    );
};
