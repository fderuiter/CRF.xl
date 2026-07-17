/**
 * @issue #28
 */
import * as React from "react";
import { Spinner as FluentSpinner } from "@fluentui/react-components";

// ============================================================================
// LOADING SPINNER
// ============================================================================
export const Spinner: React.FC<{ className?: string }> = () => <FluentSpinner size="small" />;

// ============================================================================
// ACCESSIBLE WRAPPER
// ============================================================================
interface AccessibleWrapperProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onClick"> {
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
