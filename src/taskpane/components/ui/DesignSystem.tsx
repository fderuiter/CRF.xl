import * as React from 'react';
import {
    Button as FluentButton,
    Spinner as FluentSpinner,
    Badge as FluentBadge,
    makeStyles,
    tokens,
} from '@fluentui/react-components';

// ============================================================================
// 1. BUTTON COMPONENT
// ============================================================================
type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';

interface ButtonProps {
    variant?: ButtonVariant;
    isLoading?: boolean;
    icon?: React.ReactNode;
    children?: React.ReactNode;
    disabled?: boolean;
    onClick?: React.MouseEventHandler<HTMLButtonElement>;
    className?: string;
}

const useButtonStyles = makeStyles({
    fullWidth: {
        width: '100%',
        justifyContent: 'center',
    },
    danger: {
        backgroundColor: tokens.colorPaletteRedBackground3,
        color: tokens.colorNeutralForegroundOnBrand,
        ':hover': {
            backgroundColor: tokens.colorPaletteRedForeground1,
        },
    },
});

export const Button: React.FC<ButtonProps> = ({
    children, variant = 'primary', isLoading, icon, disabled, onClick,
}) => {
    const styles = useButtonStyles();

    const appearance =
        variant === 'primary' ? 'primary' :
        variant === 'secondary' ? 'secondary' :
        variant === 'outline' ? 'outline' :
        variant === 'ghost' ? 'subtle' :
        'primary';

    return (
        <FluentButton
            appearance={appearance}
            className={`${styles.fullWidth}${variant === 'danger' ? ` ${styles.danger}` : ''}`}
            icon={isLoading ? <FluentSpinner size="tiny" /> : (icon as any)}
            disabled={disabled || isLoading}
            onClick={onClick}
        >
            {children}
        </FluentButton>
    );
};

// ============================================================================
// 2. LOADING SPINNER
// ============================================================================
export const Spinner: React.FC<{ className?: string }> = () => (
    <FluentSpinner size="small" />
);

// ============================================================================
// 3. CARD COMPONENT
// ============================================================================
const useCardStyles = makeStyles({
    card: {
        backgroundColor: tokens.colorNeutralBackground1,
        borderRadius: tokens.borderRadiusLarge,
        boxShadow: tokens.shadow4,
        border: `1px solid ${tokens.colorNeutralStroke2}`,
        overflow: 'hidden',
    },
});

export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children }) => {
    const styles = useCardStyles();
    return <div className={styles.card}>{children}</div>;
};

// ============================================================================
// 4. BADGE COMPONENT
// ============================================================================
type BadgeVariant = 'success' | 'warning' | 'error' | 'neutral';

const colorMap: Record<BadgeVariant, 'success' | 'warning' | 'danger' | 'informative'> = {
    success: 'success',
    warning: 'warning',
    error: 'danger',
    neutral: 'informative',
};

export const Badge: React.FC<{ children: React.ReactNode; variant?: BadgeVariant; className?: string }> = ({
    children, variant = 'neutral',
}) => (
    <FluentBadge color={colorMap[variant]} appearance="tint" shape="rounded">
        {children}
    </FluentBadge>
);
