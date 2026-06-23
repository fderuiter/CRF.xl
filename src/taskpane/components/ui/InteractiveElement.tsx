/* eslint-disable no-undef */
/**
 * @issue #273
 */
import * as React from "react";
import { mergeClasses, makeStyles } from "@fluentui/react-components";

interface InteractiveElementProps {
  onClick: (e: React.MouseEvent | React.KeyboardEvent) => void;
  children: React.ReactNode;
  className?: string;
  role?: string;
  ariaExpanded?: boolean;
  ariaLabel?: string;
  tabIndex?: number;
  style?: React.CSSProperties;
}

const useStyles = makeStyles({
  resetButton: {
    background: "none",
    border: "none",
    padding: 0,
    margin: 0,
    font: "inherit",
    color: "inherit",
    cursor: "pointer",
    textAlign: "inherit",
    display: "block",
    width: "100%",
  },
});

export const InteractiveElement: React.FC<InteractiveElementProps> = ({
  onClick,
  children,
  className,
  role = "button",
  ariaExpanded,
  ariaLabel,
  tabIndex = 0,
  style,
}) => {
  const styles = useStyles();

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick(e);
    }
  };

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events
    <div
      className={className}
      style={style}
      onClick={onClick as any}
      onKeyDown={handleKeyDown}
      tabIndex={tabIndex}
      role={role}
      aria-expanded={ariaExpanded}
      aria-label={ariaLabel}
    >
      {children}
    </div>
  );
};
