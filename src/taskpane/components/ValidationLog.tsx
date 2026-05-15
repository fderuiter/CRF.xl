import * as React from 'react';
import { makeStyles, tokens, Text, Badge, Button } from '@fluentui/react-components';
import { CheckmarkCircle20Regular, ErrorCircle20Filled, ArrowRight16Regular } from '@fluentui/react-icons';

const useStyles = makeStyles({
    emptyCard: {
        flex: 1,
        backgroundColor: tokens.colorNeutralBackground1,
        borderRadius: tokens.borderRadiusXLarge,
        border: `1px dashed ${tokens.colorNeutralStroke1}`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        textAlign: 'center',
        boxShadow: tokens.shadow2,
    },
    emptyIcon: {
        width: '44px',
        height: '44px',
        backgroundColor: tokens.colorPaletteGreenBackground1,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '8px',
        color: tokens.colorPaletteGreenForeground1,
    },
    emptyTitle: {
        fontSize: tokens.fontSizeBase300,
        fontWeight: tokens.fontWeightBold,
        color: tokens.colorNeutralForeground1,
        marginBottom: '4px',
    },
    emptySubtitle: {
        fontSize: tokens.fontSizeBase200,
        color: tokens.colorNeutralForeground3,
    },
    logCard: {
        flex: 1,
        backgroundColor: tokens.colorNeutralBackground1,
        borderRadius: tokens.borderRadiusXLarge,
        border: `1px solid ${tokens.colorNeutralStroke2}`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: tokens.shadow2,
    },
    logHeader: {
        padding: '8px 12px',
        backgroundColor: tokens.colorNeutralBackground2,
        borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    logTitle: {
        fontSize: tokens.fontSizeBase100,
        fontWeight: tokens.fontWeightBold,
        color: tokens.colorNeutralForeground3,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
    },
    logBody: {
        flex: 1,
        overflowY: 'auto',
        padding: '10px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    issueRow: {
        padding: '10px 12px',
        backgroundColor: tokens.colorNeutralBackground1,
        border: `1px solid ${tokens.colorPaletteRedBorder2}`,
        borderLeft: `4px solid ${tokens.colorPaletteRedForeground1}`,
        borderRadius: tokens.borderRadiusMedium,
        position: 'relative',
        boxShadow: tokens.shadow2,
    },
    issueMsg: {
        fontSize: tokens.fontSizeBase200,
        fontWeight: tokens.fontWeightSemibold,
        color: tokens.colorNeutralForeground1,
        paddingRight: '28px',
        lineHeight: '1.4',
    },
    issueLocation: {
        fontSize: tokens.fontSizeBase100,
        color: tokens.colorNeutralForeground3,
        marginTop: '3px',
        textTransform: 'uppercase',
        fontWeight: tokens.fontWeightSemibold,
        letterSpacing: '0.04em',
    },
    navBtn: {
        position: 'absolute',
        top: '8px',
        right: '6px',
    },
});

export const ValidationLog = ({ issues, isProcessing, onNavigate }: any) => {
    const styles = useStyles();

    if (isProcessing) return null;

    if (issues.length === 0) return (
        <div className={styles.emptyCard}>
            <div className={styles.emptyIcon}>
                <CheckmarkCircle20Regular />
            </div>
            <Text className={styles.emptyTitle}>Clean Specification</Text>
            <Text className={styles.emptySubtitle}>No issues detected in current scope.</Text>
        </div>
    );

    return (
        <div className={styles.logCard}>
            <div className={styles.logHeader}>
                <Text className={styles.logTitle}>Diagnostic Log</Text>
                <Badge color="danger" appearance="tint">{issues.length} Issues</Badge>
            </div>
            <div className={styles.logBody}>
                {issues.map((issue: any, idx: number) => (
                    <div key={idx} className={styles.issueRow}>
                        <Text className={styles.issueMsg}>{issue.message}</Text>
                        <Text className={styles.issueLocation}>{issue.location}</Text>
                        {issue.rowIndex !== undefined && (
                            <Button
                                className={styles.navBtn}
                                appearance="subtle"
                                size="small"
                                icon={<ArrowRight16Regular />}
                                onClick={() => onNavigate({ ...issue, location: issue.sheetName })}
                            />
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};
