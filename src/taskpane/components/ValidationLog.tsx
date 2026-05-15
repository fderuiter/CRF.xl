import * as React from 'react';
import { Badge, Button, makeStyles, tokens, Text, Spinner } from '@fluentui/react-components';
import { CheckmarkCircleRegular, SearchRegular } from '@fluentui/react-icons';

const useStyles = makeStyles({
    emptyState: {
        flexGrow: 1,
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
        fontSize: '28px',
        color: tokens.colorPaletteGreenForeground2,
        marginBottom: '8px',
    },
    emptyTitle: {
        fontWeight: tokens.fontWeightSemibold,
        color: tokens.colorNeutralForeground1,
        marginBottom: '4px',
    },
    emptyDesc: {
        fontSize: tokens.fontSizeBase100,
        color: tokens.colorNeutralForeground3,
    },
    logContainer: {
        flexGrow: 1,
        backgroundColor: tokens.colorNeutralBackground1,
        borderRadius: tokens.borderRadiusXLarge,
        border: `1px solid ${tokens.colorNeutralStroke1}`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: tokens.shadow2,
    },
    logHeader: {
        padding: '10px 12px',
        backgroundColor: tokens.colorNeutralBackground3,
        borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
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
        flexGrow: 1,
        overflowY: 'auto',
        padding: '10px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    issueCard: {
        padding: '10px 12px',
        backgroundColor: tokens.colorNeutralBackground1,
        border: `1px solid ${tokens.colorPaletteRedBorder1}`,
        borderLeftWidth: '4px',
        borderLeftColor: tokens.colorPaletteRedBorder2,
        borderRadius: tokens.borderRadiusMedium,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
    },
    issueMessage: {
        fontSize: tokens.fontSizeBase200,
        fontWeight: tokens.fontWeightSemibold,
        color: tokens.colorNeutralForeground1,
        paddingRight: '28px',
    },
    issueLocation: {
        fontSize: tokens.fontSizeBase100,
        color: tokens.colorNeutralForeground3,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
    },
    navigateButton: {
        position: 'absolute',
        top: '8px',
        right: '8px',
        minWidth: 'auto',
    },
});

export const ValidationLog = ({ issues, isProcessing, onNavigate }: any) => {
    const styles = useStyles();

    if (isProcessing) return null;

    if (issues.length === 0) return (
        <div className={styles.emptyState}>
            <CheckmarkCircleRegular className={styles.emptyIcon} fontSize={28} />
            <Text className={styles.emptyTitle} block>Clean Specification</Text>
            <Text className={styles.emptyDesc}>No issues detected in current scope.</Text>
        </div>
    );

    return (
        <div className={styles.logContainer}>
            <div className={styles.logHeader}>
                <Text className={styles.logTitle}>Diagnostic Log</Text>
                <Badge color="danger" appearance="tint">{issues.length} Issues</Badge>
            </div>
            <div className={styles.logBody}>
                {issues.map((issue: any, idx: number) => (
                    <div key={idx} className={styles.issueCard}>
                        <Text className={styles.issueMessage}>{issue.message}</Text>
                        <Text className={styles.issueLocation}>{issue.location}</Text>
                        {issue.rowIndex !== undefined && (
                            <Button
                                className={styles.navigateButton}
                                appearance="subtle"
                                size="small"
                                icon={<SearchRegular />}
                                onClick={() => onNavigate({ ...issue, location: issue.sheetName })}
                            />
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};
