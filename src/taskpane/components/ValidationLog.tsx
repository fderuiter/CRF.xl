import * as React from 'react';
import { Badge, Body1, Button, Skeleton, SkeletonItem, makeStyles, tokens } from '@fluentui/react-components';
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
        color: tokens.colorStatusSuccessForeground1,
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
        backgroundColor: tokens.colorStatusDangerBackground1,
        border: `1px solid ${tokens.colorStatusDangerBorder1}`,
        borderLeftWidth: '4px',
        borderLeftColor: tokens.colorStatusDangerBorder2,
        borderRadius: tokens.borderRadiusMedium,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
    },
    warningIssueCard: {
        backgroundColor: tokens.colorStatusWarningBackground1,
        border: `1px solid ${tokens.colorStatusWarningBorder1}`,
        borderLeftColor: tokens.colorStatusWarningBorder2,
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
    skeletonRoot: {
        flexGrow: 1,
        backgroundColor: tokens.colorNeutralBackground1,
        borderRadius: tokens.borderRadiusXLarge,
        border: `1px solid ${tokens.colorNeutralStroke1}`,
        boxShadow: tokens.shadow2,
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
    },
    skeletonRow: {
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
    },
});

export const ValidationLog = ({ issues, isProcessing, onNavigate }: any) => {
    const styles = useStyles();

    if (isProcessing) return (
        <div className={styles.skeletonRoot}>
            <Skeleton>
                <SkeletonItem shape="rectangle" size={16} style={{ width: '45%' }} />
            </Skeleton>
            {[0, 1, 2].map((item) => (
                <div key={item} className={styles.skeletonRow}>
                    <Skeleton>
                        <SkeletonItem shape="rectangle" size={14} style={{ width: '85%' }} />
                    </Skeleton>
                    <Skeleton>
                        <SkeletonItem shape="rectangle" size={12} style={{ width: '45%' }} />
                    </Skeleton>
                </div>
            ))}
        </div>
    );

    if (issues.length === 0) return (
        <div className={styles.emptyState}>
            <CheckmarkCircleRegular className={styles.emptyIcon} fontSize={28} />
            <Body1 className={styles.emptyTitle}>Clean Specification</Body1>
            <Body1 className={styles.emptyDesc}>No issues detected in current scope.</Body1>
        </div>
    );

    return (
        <div className={styles.logContainer}>
            <div className={styles.logHeader}>
                <Body1 className={styles.logTitle}>Diagnostic Log</Body1>
                <Badge color={issues.some((issue: any) => issue.level === 'Error') ? 'danger' : 'warning'} appearance="tint">
                    {issues.length} Issues
                </Badge>
            </div>
            <div className={styles.logBody}>
                {issues.map((issue: any, idx: number) => (
                    <div key={idx} className={issue.level === 'Warning' ? `${styles.issueCard} ${styles.warningIssueCard}` : styles.issueCard}>
                        <Body1 className={styles.issueMessage}>{issue.message}</Body1>
                        <Body1 className={styles.issueLocation}>{issue.location}</Body1>
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
