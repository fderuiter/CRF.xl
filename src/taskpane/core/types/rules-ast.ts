/**
 * ============================================================================
 * rules-ast.ts
 * ============================================================================
 * AST node types, location tracking, and RuleDefinition structure for the rules language.
 */

export interface SourcePosition {
  offset: number; // 0-based character offset
  line: number; // 1-based line number
  column: number; // 1-based column number
}

export interface SourceLocation {
  start: SourcePosition;
  end: SourcePosition;
}

export type TokenType =
  | "LPAREN"
  | "RPAREN"
  | "COMMA"
  | "OPERATOR"
  | "STRING"
  | "NUMBER"
  | "KEYWORD"
  | "BOOLEAN"
  | "NULL"
  | "IDENTIFIER"
  | "EOF";

export interface Token {
  type: TokenType;
  value: string;
  start: SourcePosition;
  end: SourcePosition;
}

export interface BaseASTNode {
  type: string;
  loc: SourceLocation;
}

export interface LiteralNode extends BaseASTNode {
  type: "Literal";
  value: number | string | boolean | null;
  raw: string;
}

export interface IdentifierNode extends BaseASTNode {
  type: "Identifier";
  name: string; // e.g. "WT", "VS.WT", "VISIT_1.VS.WT"
}

export interface UnaryExpressionNode extends BaseASTNode {
  type: "UnaryExpression";
  operator: string; // "-", "+", "!", "not"
  argument: ASTNode;
}

export interface BinaryExpressionNode extends BaseASTNode {
  type: "BinaryExpression";
  operator: string; // "+", "-", "*", "/", "%", "==", "!=", "<>", "<", "<=", ">", ">=", "&&", "||", "and", "or"
  left: ASTNode;
  right: ASTNode;
}

export interface ConditionalExpressionNode extends BaseASTNode {
  type: "ConditionalExpression";
  test: ASTNode;
  consequent: ASTNode;
  alternate: ASTNode;
}

export interface CallExpressionNode extends BaseASTNode {
  type: "CallExpression";
  callee: string; // case-insensitive function name, e.g. "isMissing", "mean", "sum"
  arguments: ASTNode[];
}

export interface GroupedExpressionNode extends BaseASTNode {
  type: "GroupedExpression";
  expression: ASTNode;
}

export type ASTNode =
  | LiteralNode
  | IdentifierNode
  | UnaryExpressionNode
  | BinaryExpressionNode
  | ConditionalExpressionNode
  | CallExpressionNode
  | GroupedExpressionNode;

export enum RuleType {
  VALIDATION = "VALIDATION",
  DERIVATION = "DERIVATION",
  SHOW_IF = "SHOW_IF",
}

export interface RuleDefinition {
  ruleId: string;
  name?: string;
  ruleType: RuleType;
  target?: string;
  expression: string;
  errorMessage?: string;
  description?: string;
  ast?: ASTNode;
  parseError?: string; // If parsing failed, save the error message
  _sourceRowIndex: number;
}

export class ParseError extends Error {
  public readonly loc: SourceLocation;
  public readonly line: number;
  public readonly column: number;
  public readonly offset: number;

  constructor(message: string, loc: SourceLocation) {
    super(`${message} (${loc.start.line}:${loc.start.column})`);
    this.name = "ParseError";
    this.loc = loc;
    this.line = loc.start.line;
    this.column = loc.start.column;
    this.offset = loc.start.offset;
    Object.setPrototypeOf(this, ParseError.prototype);
  }
}
