# Rules & Logic AST Contract Specification

This document defines the formal syntax, grammar, Abstract Syntax Tree (AST) schema, and cycle-validation mechanisms for the CRF.xl rules parsing engine. Grounded in clinical data structures, it details how spreadsheet-level Show If conditions and Derivation calculations are parsed, validated, and serialized.

---

## 🎯 Lexical Grammar & Syntax

The rules parser parses clinical expressions entered into the `Show If` and `Derivation` columns of form sheets. Expressions refer to variables and values to evaluate logical visibility or calculations.

### 1. Tokenizer Specification
* **Identifiers:** Variables are referenced by their OIDs. Variable tokens match: `[A-Za-z_][A-Za-z0-9_]*`.
* **String Literals:** Single or double-quoted strings (e.g., `'Yes'`, `"No"`).
* **Numeric Literals:** Floats or integers (e.g., `10`, `3.14`).
* **Logical Operators:** Logical connectors `and`, `or`, and logical negation `not`.
* **Comparison Operators:** Comparison tokens `==`, `!=`, `<`, `<=`, `>`, `>=`.
* **Arithmetic Operators:** Standard math symbols `+`, `-`, `*`, `/`.
* **Syntax Anchors:** Parentheses `(` and `)` for operator precedence grouping.

---

## 📦 Abstract Syntax Tree (AST) Schema

Parsed expressions are represented as strongly-typed AST node structures. The compiler maps these nodes into standard clinical and programming formats:

```typescript
export type ASTNode =
  | LiteralNode
  | IdentifierNode
  | UnaryExpressionNode
  | BinaryExpressionNode
  | ConditionalExpressionNode
  | CallExpressionNode
  | GroupedExpressionNode;

export interface BaseASTNode {
  type: string;
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
```

---

## ⚙️ Compilation & Cycle Validation (DAG)

To ensure referential and logical integrity across multi-sheet clinical studies, expressions undergo topological sort checks and cycle-detection runs.

### 1. Topological Sorting (Chronological Dependent-to-Provider Evaluation Order)
Derivations are sorted using a Directed Acyclic Graph (DAG) validation parser (`dag-validator.ts`). This ensures a strict **chronological dependent-to-provider evaluation order**:
* **Providers** (independent variables or source values) are computed and resolved *first*.
* **Dependents** (variables containing expressions referencing those providers) are evaluated *after* their providers are completely calculated.
This ensures that if Variable `B` is derived from Variable `A`, Variable `A` is parsed and evaluated before Variable `B`.

### 2. Cycle Detection
* **Graph Definition:** Vertices represent variables; directed edges represent dependency references inside calculations (e.g., `A -> B` if `B` references `A` in its derivation expression).
* **Algorithm:** The validator runs a depth-first search (DFS) with a three-color marking scheme (white/gray/black nodes) to detect and block cyclical loops.
* **Severity:** If a cycle is detected, the validator raises a **Critical Error** blocking export, providing a detailed location trace of the cyclical dependency (e.g., `Cycles detected: A -> B -> C -> A`).

---

## 💾 CDISC ODM XML Serialization

When exporting to CDISC ODM v1.3.2, the logic AST is converted into formal XML definitions:

### 1. Visibility Rules (`Show If`)
The compiler maps `Show If` AST structures to ODM `<ConditionDef>` tags within the `<Study>` schema:
* Program nodes convert to SQL-like logic strings in the `Description` block.
* The `<ConditionDef>` OID matches `COND.[VariableOID]`.
* Mapped to `<StudyEventRef>`, `<FormRef>`, or `<ItemGroupRef>` via the corresponding XML structures.

### 2. Derivations (`Calculations`)
Calculations map strictly to ODM `<MethodDef>` tags:
* Mapped via `COND.[VariableOID]` using `MethodDef` tags within `<ItemRef>` bindings.
* Mathematical and conditional logic expressions serialize into pure JavaScript syntax inside the `<MethodDef>` description.
