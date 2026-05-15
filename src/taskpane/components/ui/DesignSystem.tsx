import * as React from 'react';
import {
    Button as FluentButton,
    Spinner as FluentSpinner,
    Card as FluentCard,
    Badge as FluentBadge,
    makeStyles,
    tokens,
    mergeClasses,
} from '@fluentui/react-components';

// ============================================================================
// 1. BUTTON COMPONENT
// ============================================================================
type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    isLoading?: boolean;
    icon?: React.ReactNode;
}

const useButtonStyles = makeStyles({
    base: {
        width: '100%',
        justifyContent: 'center',
    },
});

export const Button: React.FC<ButtonProps> = ({
    children, variant = 'primary', isLoading, icon, disabled, onClick,
}) => {
    const styles = useButtonStyles();
    const appearance = variant === 'primary' ? 'primary'
        : variant === 'danger' ? 'primary'
        : variant === 'ghost' ? 'subtle'
        : variant === 'outline' ? 'outline'
        : 'secondary';

    return (
        <FluentButton
            className={styles.base}
            appearance={appearance}
            disabled={disabled || isLoading}
            icon={isLoading ? <FluentSpinner size="tiny" /> : (icon as any)}
            onClick={onClick as any}
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
        width: '100%',
        boxSizing: 'border-box',
    },
});

export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children }) => {
    const styles = useCardStyles();
    return (
        <FluentCard className={styles.card}>
            {children}
        </FluentCard>
    );
};

// ============================================================================
// 4. BADGE COMPONENT
// ============================================================================
type BadgeVariant = 'success' | 'warning' | 'error' | 'neutral';

export const Badge: React.FC<{ children: React.ReactNode; variant?: BadgeVariant; className?: string }> = ({
    children, variant = 'neutral',
}) => {
    const color = variant === 'success' ? 'success'
        : variant === 'warning' ? 'warning'
        : variant === 'error' ? 'danger'
        : 'informative';

    return (
        <FluentBadge color={color} appearance="tint">
            {children}
        </FluentBadge>
    );
};

export { mergeClasses, makeStyles, tokens };
