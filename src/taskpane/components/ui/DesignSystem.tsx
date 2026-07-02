/**
 * @issue #28
 */
import * as React from "react";
import {
  Button as FluentButton,
  Spinner as FluentSpinner,
  Card as FluentCard,
  Badge as FluentBadge,
  makeStyles,
  tokens,
  mergeClasses,
} from "@fluentui/react-components";

// ============================================================================
// 1. BUTTON COMPONENT
// ============================================================================
type ButtonVariant = "primary" | "secondary" | "outline" | "danger" | "ghost";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  isLoading?: boolean;
  icon?: React.ReactNode;
}

const useButtonStyles = makeStyles({
  base: {
    width: "100%",
    justifyContent: "center",
  },
});

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  isLoading,
  icon,
  disabled,
  onClick,
  className,
}) => {
  const styles = useButtonStyles();
  const appearance =
    variant === "primary"
      ? "primary"
      : variant === "danger"
        ? "primary"
        : variant === "ghost"
          ? "subtle"
          : variant === "outline"
            ? "outline"
            : "secondary";

  return (
    <FluentButton
      className={mergeClasses(styles.base, className)}
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
export const Spinner: React.FC<{ className?: string }> = () => <FluentSpinner size="small" />;

// ============================================================================
// 3. CARD COMPONENT
// ============================================================================
const useCardStyles = makeStyles({
  card: {
    width: "100%",
    boxSizing: "border-box",
  },
});

export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children }) => {
  const styles = useCardStyles();
  return <FluentCard className={styles.card}>{children}</FluentCard>;
};

// ============================================================================
// 4. BADGE COMPONENT
// ============================================================================
type BadgeVariant = "success" | "warning" | "error" | "neutral";

export const Badge: React.FC<{
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}> = ({ children, variant = "neutral" }) => {
  const color =
    variant === "success"
      ? "success"
      : variant === "warning"
        ? "warning"
        : variant === "error"
          ? "danger"
          : "informative";

  return (
    <FluentBadge color={color} appearance="tint">
      {children}
    </FluentBadge>
  );
};

// ============================================================================
// 5. ACCESSIBLE WRAPPER
// ============================================================================
export interface AccessibleWrapperProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "onClick"
> {
  onClick?: (e: React.MouseEvent<HTMLDivElement> | React.KeyboardEvent<HTMLDivElement>) => void;
  role?: React.AriaRole;
  ariaLabel?: string;
  children: React.ReactNode;
  disabled?: boolean;
}

export const AccessibleWrapper: React.FC<AccessibleWrapperProps> = ({
  onClick,
  role = "button",
  ariaLabel,
  children,
  disabled,
  tabIndex,
  onKeyDown,
  ...rest
}) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick?.(e);
    }
    onKeyDown?.(e);
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled) return;
    onClick?.(e);
  };

  return (
    <div
      role={role}
      tabIndex={disabled ? -1 : (tabIndex ?? 0)}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-label={ariaLabel}
      aria-disabled={disabled}
      {...rest}
    >
      {children}
    </div>
  );
};

export { mergeClasses, makeStyles, tokens };
