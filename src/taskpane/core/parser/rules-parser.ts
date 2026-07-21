/**
 * @issue #137
 */
/**
 * ============================================================================
 * rules-parser.ts
 * ============================================================================
 * Parser and Lexer for the CRF.xl rules language.
 */

import {
  Token,
  TokenType,
  ASTNode,
  RuleDefinition,
  RuleType,
  ParseError,
  SourcePosition,
} from "../types/index";
import { getLocaleConfig } from "../locale-config";

/**
 * Tokenizes a raw rule expression string.
 * @param expression
 * @returns
 */
export function tokenize(expression: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;
  let line = 1;
  let column = 1;

  const peekChar = (offset = 0) =>
    index + offset < expression.length ? expression[index + offset] : "";

  const consumeChar = () => {
    const char = peekChar();
    if (char === "\n") {
      line++;
      column = 1;
    } else {
      column++;
    }
    index++;
    return char;
  };

  while (index < expression.length) {
    const char = peekChar();

    // Skip whitespace
    if (/\s/.test(char)) {
      consumeChar();
      continue;
    }

    const startPos: SourcePosition = { offset: index, line, column };

    // Parentheses and punctuation
    if (char === "(") {
      consumeChar();
      tokens.push({
        type: "LPAREN",
        value: "(",
        start: startPos,
        end: { offset: index, line, column },
      });
      continue;
    }
    if (char === ")") {
      consumeChar();
      tokens.push({
        type: "RPAREN",
        value: ")",
        start: startPos,
        end: { offset: index, line, column },
      });
      continue;
    }
    const argSep = getLocaleConfig().argSeparator;
    if (char === argSep) {
      consumeChar();
      tokens.push({
        type: "COMMA",
        value: argSep,
        start: startPos,
        end: { offset: index, line, column },
      });
      continue;
    }

    // Operators (multi-character first)
    const next2 = peekChar(0) + peekChar(1);
    if (
      next2 === "==" ||
      next2 === "!=" ||
      next2 === "<=" ||
      next2 === ">=" ||
      next2 === "<>" ||
      next2 === "&&" ||
      next2 === "||"
    ) {
      consumeChar();
      consumeChar();
      tokens.push({
        type: "OPERATOR",
        value: next2,
        start: startPos,
        end: { offset: index, line, column },
      });
      continue;
    }

    // Operators (single character)
    if ("+-*/%?<>=!:".includes(char)) {
      consumeChar();
      tokens.push({
        type: "OPERATOR",
        value: char,
        start: startPos,
        end: { offset: index, line, column },
      });
      continue;
    }

    // String literals
    if (char === "'" || char === '"') {
      const quote = consumeChar();
      let val = "";
      while (index < expression.length && peekChar() !== quote) {
        if (peekChar() === "\\") {
          consumeChar(); // consume backslash
          val += consumeChar(); // consume escaped char
        } else {
          val += consumeChar();
        }
      }
      if (index >= expression.length) {
        throw new ParseError("Unclosed string literal", {
          start: startPos,
          end: { offset: index, line, column },
        });
      }
      consumeChar(); // consume closing quote
      tokens.push({
        type: "STRING",
        value: val,
        start: startPos,
        end: { offset: index, line, column },
      });
      continue;
    }

    // Number literals
    if (/\d/.test(char)) {
      let numStr = "";
      while (index < expression.length && /\d/.test(peekChar())) {
        numStr += consumeChar();
      }
      const decSep = getLocaleConfig().decimalSeparator;
      if (peekChar() === decSep && /\d/.test(peekChar(1))) {
        consumeChar(); // consume the localized decimal separator
        numStr += "."; // normalize to '.' for the internal AST
        while (index < expression.length && /\d/.test(peekChar())) {
          numStr += consumeChar();
        }
      }
      tokens.push({
        type: "NUMBER",
        value: numStr,
        start: startPos,
        end: { offset: index, line, column },
      });
      continue;
    }

    // Identifiers, Keywords, and Literals
    if (/[a-zA-Z_]/.test(char)) {
      let idStr = "";
      while (index < expression.length && /[a-zA-Z0-9_.]/.test(peekChar())) {
        idStr += consumeChar();
      }

      const idLower = idStr.toLowerCase();

      if (idLower === "if" || idLower === "then" || idLower === "else") {
        tokens.push({
          type: "KEYWORD",
          value: idLower,
          start: startPos,
          end: { offset: index, line, column },
        });
      } else if (idLower === "and" || idLower === "or" || idLower === "not") {
        tokens.push({
          type: "OPERATOR",
          value: idLower,
          start: startPos,
          end: { offset: index, line, column },
        });
      } else if (idLower === "true" || idLower === "false") {
        tokens.push({
          type: "BOOLEAN",
          value: idLower,
          start: startPos,
          end: { offset: index, line, column },
        });
      } else if (idLower === "null") {
        tokens.push({
          type: "NULL",
          value: idLower,
          start: startPos,
          end: { offset: index, line, column },
        });
      } else {
        tokens.push({
          type: "IDENTIFIER",
          value: idStr,
          start: startPos,
          end: { offset: index, line, column },
        });
      }
      continue;
    }

    // Unrecognized character
    consumeChar();
    throw new ParseError(`Unexpected character: '${char}'`, {
      start: startPos,
      end: { offset: index, line, column },
    });
  }

  tokens.push({
    type: "EOF",
    value: "",
    start: { offset: index, line, column },
    end: { offset: index, line, column },
  });

  return tokens;
}

/**
 * Recursive descent parser for the versioned grammar.
 */
class Parser {
  private tokens: Token[];
  private current = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private peek(): Token {
    return this.tokens[this.current];
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }

  private isAtEnd(): boolean {
    return this.peek().type === "EOF";
  }

  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) return this.advance();
    throw new ParseError(message, { start: this.peek().start, end: this.peek().end });
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private match(type: TokenType, value?: string): boolean {
    if (this.check(type)) {
      if (value !== undefined) {
        const valLower = this.peek().value.toLowerCase();
        if (valLower !== value.toLowerCase()) return false;
      }
      this.advance();
      return true;
    }
    return false;
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  public parse(): ASTNode {
    const expr = this.parseExpression();
    if (!this.isAtEnd()) {
      const remaining = this.peek();
      throw new ParseError(`Unexpected extra token: '${remaining.value}'`, {
        start: remaining.start,
        end: remaining.end,
      });
    }
    return expr;
  }

  private parseExpression(): ASTNode {
    // 1. If-Then-Else Conditional
    if (this.match("KEYWORD", "if")) {
      const ifToken = this.previous();
      const test = this.parseExpression();
      this.consume("KEYWORD", "Expected 'then' after if condition.");
      const consequent = this.parseExpression();
      this.consume("KEYWORD", "Expected 'else' after then branch.");
      const alternate = this.parseExpression();
      return {
        type: "ConditionalExpression",
        test,
        consequent,
        alternate,
        loc: { start: ifToken.start, end: this.previous().end },
      };
    }

    // 2. Ternary Operator
    return this.parseTernary();
  }

  private parseTernary(): ASTNode {
    const expr = this.parseLogicalOr();
    if (this.match("OPERATOR", "?")) {
      const consequent = this.parseExpression();
      this.consume("OPERATOR", "Expected ':' in ternary expression.");
      const alternate = this.parseExpression();
      return {
        type: "ConditionalExpression",
        test: expr,
        consequent,
        alternate,
        loc: { start: expr.loc.start, end: this.previous().end },
      };
    }
    return expr;
  }

  private parseLogicalOr(): ASTNode {
    let expr = this.parseLogicalAnd();
    while (this.match("OPERATOR", "||") || this.match("OPERATOR", "or")) {
      const opToken = this.previous();
      const right = this.parseLogicalAnd();
      expr = {
        type: "BinaryExpression",
        operator: opToken.value.toLowerCase() === "or" ? "||" : opToken.value,
        left: expr,
        right,
        loc: { start: expr.loc.start, end: right.loc.end },
      };
    }
    return expr;
  }

  private parseLogicalAnd(): ASTNode {
    let expr = this.parseEquality();
    while (this.match("OPERATOR", "&&") || this.match("OPERATOR", "and")) {
      const opToken = this.previous();
      const right = this.parseEquality();
      expr = {
        type: "BinaryExpression",
        operator: opToken.value.toLowerCase() === "and" ? "&&" : opToken.value,
        left: expr,
        right,
        loc: { start: expr.loc.start, end: right.loc.end },
      };
    }
    return expr;
  }

  private parseEquality(): ASTNode {
    let expr = this.parseComparison();
    while (
      this.match("OPERATOR", "==") ||
      this.match("OPERATOR", "!=") ||
      this.match("OPERATOR", "<>")
    ) {
      const opToken = this.previous();
      const right = this.parseComparison();
      const op = opToken.value === "<>" ? "!=" : opToken.value;
      expr = {
        type: "BinaryExpression",
        operator: op,
        left: expr,
        right,
        loc: { start: expr.loc.start, end: right.loc.end },
      };
    }
    return expr;
  }

  private parseComparison(): ASTNode {
    let expr = this.parseAdditive();
    while (
      this.match("OPERATOR", "<") ||
      this.match("OPERATOR", "<=") ||
      this.match("OPERATOR", ">") ||
      this.match("OPERATOR", ">=")
    ) {
      const opToken = this.previous();
      const right = this.parseAdditive();
      expr = {
        type: "BinaryExpression",
        operator: opToken.value,
        left: expr,
        right,
        loc: { start: expr.loc.start, end: right.loc.end },
      };
    }
    return expr;
  }

  private parseAdditive(): ASTNode {
    let expr = this.parseMultiplicative();
    while (this.match("OPERATOR", "+") || this.match("OPERATOR", "-")) {
      const opToken = this.previous();
      const right = this.parseMultiplicative();
      expr = {
        type: "BinaryExpression",
        operator: opToken.value,
        left: expr,
        right,
        loc: { start: expr.loc.start, end: right.loc.end },
      };
    }
    return expr;
  }

  private parseMultiplicative(): ASTNode {
    let expr = this.parseUnary();
    while (
      this.match("OPERATOR", "*") ||
      this.match("OPERATOR", "/") ||
      this.match("OPERATOR", "%")
    ) {
      const opToken = this.previous();
      const right = this.parseUnary();
      expr = {
        type: "BinaryExpression",
        operator: opToken.value,
        left: expr,
        right,
        loc: { start: expr.loc.start, end: right.loc.end },
      };
    }
    return expr;
  }

  private parseUnary(): ASTNode {
    if (
      this.match("OPERATOR", "-") ||
      this.match("OPERATOR", "+") ||
      this.match("OPERATOR", "!") ||
      this.match("OPERATOR", "not")
    ) {
      const opToken = this.previous();
      const argument = this.parseUnary();
      return {
        type: "UnaryExpression",
        operator: opToken.value.toLowerCase() === "not" ? "!" : opToken.value,
        argument,
        loc: { start: opToken.start, end: argument.loc.end },
      };
    }
    return this.parsePrimary();
  }

  private parsePrimary(): ASTNode {
    if (this.match("LPAREN")) {
      const openToken = this.previous();
      const expression = this.parseExpression();
      this.consume("RPAREN", "Expected ')' after expression.");
      const closeToken = this.previous();
      return {
        type: "GroupedExpression",
        expression,
        loc: { start: openToken.start, end: closeToken.end },
      };
    }

    if (this.match("NUMBER")) {
      const tok = this.previous();
      return {
        type: "Literal",
        value: Number(tok.value),
        raw: tok.value,
        loc: { start: tok.start, end: tok.end },
      };
    }

    if (this.match("STRING")) {
      const tok = this.previous();
      return {
        type: "Literal",
        value: tok.value,
        raw: `"${tok.value}"`,
        loc: { start: tok.start, end: tok.end },
      };
    }

    if (this.match("BOOLEAN")) {
      const tok = this.previous();
      return {
        type: "Literal",
        value: tok.value.toLowerCase() === "true",
        raw: tok.value,
        loc: { start: tok.start, end: tok.end },
      };
    }

    if (this.match("NULL")) {
      const tok = this.previous();
      return {
        type: "Literal",
        value: null,
        raw: tok.value,
        loc: { start: tok.start, end: tok.end },
      };
    }

    if (this.match("IDENTIFIER")) {
      const idToken = this.previous();
      // Check if it's a function call
      if (this.match("LPAREN")) {
        const args: ASTNode[] = [];
        if (!this.check("RPAREN")) {
          do {
            args.push(this.parseExpression());
          } while (this.match("COMMA"));
        }
        this.consume("RPAREN", "Expected ')' after function arguments.");
        const closeToken = this.previous();
        return {
          type: "CallExpression",
          callee: idToken.value,
          arguments: args,
          loc: { start: idToken.start, end: closeToken.end },
        };
      }

      return {
        type: "Identifier",
        name: idToken.value,
        loc: { start: idToken.start, end: idToken.end },
      };
    }

    throw new ParseError(`Expected expression, found token: '${this.peek().value}'`, {
      start: this.peek().start,
      end: this.peek().end,
    });
  }
}

/**
 * Parses a single rule expression string into its corresponding ASTNode.
 * @param expression
 * @returns
 */
export function parseRuleExpression(expression: string): ASTNode {
  const tokens = tokenize(expression);
  const parser = new Parser(tokens);
  return parser.parse();
}

/**
 * Parses workbook rows from the `_Rules` sheet into RuleDefinition[] structures.
 * @param rows
 * @param _studyVersion
 * @returns
 */
export function parseRulesSheetRows(
  rows: unknown[][],
  _studyVersion: string
): { rules: RuleDefinition[]; errors: ParseError[] } {
  void _studyVersion;
  const rules: RuleDefinition[] = [];
  const errors: ParseError[] = [];

  if (rows.length === 0) return { rules, errors };

  const headers = (rows[0] || []).map((h) => String(h).toLowerCase().trim());

  const ruleIdIdx = headers.findIndex(
    (h) => h === "rule id" || h === "rule_id" || h === "rule oid" || h === "rule_oid"
  );
  const nameIdx = headers.findIndex((h) => h === "rule name" || h === "name");
  const typeIdx = headers.findIndex((h) => h === "rule type" || h === "type");
  const targetIdx = headers.findIndex(
    (h) => h === "target" || h === "target variable" || h === "variable name"
  );
  const exprIdx = headers.findIndex(
    (h) => h === "expression" || h === "formula" || h === "rule expression"
  );
  const msgIdx = headers.findIndex(
    (h) => h === "error message" || h === "message" || h === "error_message"
  );
  const descIdx = headers.findIndex((h) => h === "description");

  if (ruleIdIdx === -1 || exprIdx === -1) {
    return { rules, errors };
  }

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const ruleId = String(row[ruleIdIdx] || "").trim();
    const rawExpr = String(row[exprIdx] || "").trim();

    if (!ruleId) continue;

    if (!rawExpr) {
      const err = new ParseError(`Rule '${ruleId}' is missing an expression.`, {
        start: { offset: 0, line: i + 1, column: 1 },
        end: { offset: 0, line: i + 1, column: 1 },
      });
      errors.push(err);
      continue;
    }

    let ruleType = RuleType.VALIDATION;
    if (typeIdx !== -1 && row[typeIdx]) {
      const rawType = String(row[typeIdx]).trim().toUpperCase();
      if (rawType === "DERIVATION") ruleType = RuleType.DERIVATION;
      else if (rawType === "SHOW_IF" || rawType === "SHOW IF") ruleType = RuleType.SHOW_IF;
    }

    const definition: RuleDefinition = {
      ruleId,
      name: nameIdx !== -1 && row[nameIdx] ? String(row[nameIdx]).trim() : undefined,
      ruleType,
      target: targetIdx !== -1 && row[targetIdx] ? String(row[targetIdx]).trim() : undefined,
      expression: rawExpr,
      errorMessage: msgIdx !== -1 && row[msgIdx] ? String(row[msgIdx]).trim() : undefined,
      description: descIdx !== -1 && row[descIdx] ? String(row[descIdx]).trim() : undefined,
      _sourceRowIndex: i + 1,
    };

    try {
      definition.ast = parseRuleExpression(rawExpr);
    } catch (err) {
      if (err instanceof ParseError) {
        definition.parseError = err.message;
        const mappedErr = new ParseError(`Rule '${ruleId}' parse error: ${err.message}`, {
          start: { offset: err.offset, line: i + 1, column: err.column },
          end: { offset: err.offset, line: i + 1, column: err.column },
        });
        errors.push(mappedErr);
      } else {
        const fallbackErr = new ParseError(
          `Rule '${ruleId}' parsing failed: ${err instanceof Error ? err.message : String(err)}`,
          {
            start: { offset: 0, line: i + 1, column: 1 },
            end: { offset: 0, line: i + 1, column: 1 },
          }
        );
        definition.parseError = fallbackErr.message;
        errors.push(fallbackErr);
      }
    }

    rules.push(definition);
  }

  return { rules, errors };
}
