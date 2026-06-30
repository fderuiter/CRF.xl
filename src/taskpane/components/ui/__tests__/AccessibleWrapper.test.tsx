import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { AccessibleWrapper } from "../DesignSystem";

describe("AccessibleWrapper", () => {
  it("renders with the default button role and tabIndex 0", () => {
    render(<AccessibleWrapper>Click Me</AccessibleWrapper>);
    const element = screen.getByText("Click Me");
    expect(element).toHaveAttribute("role", "button");
    expect(element).toHaveAttribute("tabIndex", "0");
  });

  it("calls onClick when Enter is pressed", () => {
    const handleClick = jest.fn();
    render(<AccessibleWrapper onClick={handleClick}>Submit</AccessibleWrapper>);
    
    const element = screen.getByText("Submit");
    fireEvent.keyDown(element, { key: "Enter", code: "Enter" });
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("calls onClick when Space is pressed", () => {
    const handleClick = jest.fn();
    render(<AccessibleWrapper onClick={handleClick}>Submit</AccessibleWrapper>);
    
    const element = screen.getByText("Submit");
    fireEvent.keyDown(element, { key: " ", code: "Space" });
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("applies aria-disabled and tabIndex -1 when disabled", () => {
    render(<AccessibleWrapper disabled>Disabled</AccessibleWrapper>);
    
    const element = screen.getByText("Disabled");
    expect(element).toHaveAttribute("aria-disabled", "true");
    expect(element).toHaveAttribute("tabIndex", "-1");
  });

  it("does not trigger onClick if disabled", () => {
    const handleClick = jest.fn();
    render(<AccessibleWrapper onClick={handleClick} disabled>Submit</AccessibleWrapper>);
    
    const element = screen.getByText("Submit");
    fireEvent.click(element);
    fireEvent.keyDown(element, { key: "Enter" });
    expect(handleClick).not.toHaveBeenCalled();
  });
});
