import * as React from "react";
import { Button as FluentButton, ButtonProps } from "@fluentui/react-components";

export const Button: React.FC<ButtonProps> = (props) => {
  return <FluentButton {...props} />;
};
