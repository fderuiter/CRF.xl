# Global OID Registry Specification

## 1. Technical Stack
- **Language:** TypeScript
- **Paradigm:** Class-based Singleton / Registry Pattern
- **Dependencies:** None (Zero-dependency utility)

## 2. System Architecture

The `GlobalOidRegistry` serves as the central authority for Object Identifier (OID) uniqueness within the system. During workbook parsing, thousands of entities (Forms, Items, Codelists) are extracted. Each of these entities must be assigned a unique OID to guarantee structural integrity when exporting to formats like ODM-XML or performing validations.

### Role in Workbook Parsing
As the parser traverses the workbook (sheet by sheet, row by row), it extracts potential entity definitions. Before an entity is finalized and committed to the internal AST (Abstract Syntax Tree) or intermediate representation, its proposed OID is checked against the `GlobalOidRegistry`. 

If the OID is unique, it is registered. If the OID already exists, a collision is flagged. This prevents malformed clinical configurations where two distinct items or a form and an item share the same identifier, which would otherwise lead to downstream serialization or data-capture errors.

## 3. Entity Mapping

The registry currently tracks three primary Entity Types:
- **`Form`**: Represents a Case Report Form (CRF) or a clinical events group.
- **`Item`**: Represents an individual data collection point or question.
- **`Codelist`**: Represents a dictionary of permissible values for categorical items.

## 4. Collision Detection Rules

### Mechanism for Flagging Duplicates
Collision detection is case-insensitive and ignores leading/trailing whitespace.

1. **Normalization**: When an OID is passed to `register()`, it is trimmed and converted to lowercase (e.g., `  ITEM_01 ` becomes `item_01`).
2. **Lookup**: The normalized OID is checked against the internal `Map<string, EntityType>`.
3. **Collision Logging**:
   - If a match is found, the system registers a collision.
   - To avoid spamming logs for repeatedly parsed identical rows (e.g., repeating groups), a `Set<string>` named `reportedCollisions` ensures each duplicate OID is only logged once per parser run.
   - The collision record captures the raw OID, the attempted entity type, the existing entity type, the `sheetName`, and the `rowIndex`.
4. **Return Value**: The `register` method returns `false` if a collision occurred, allowing the parser to either skip the entity or append an error to the validation report.

## 5. API Contracts

### `EntityType`
```typescript
export type EntityType = "Form" | "Codelist" | "Item";
```

### `OidCollision`
```typescript
export interface OidCollision {
  oid: string;
  type: EntityType;
  existingType: EntityType;
  sheetName: string;
  rowIndex?: number;
}
```

### `GlobalOidRegistry` Methods

#### `register(oid: string, type: EntityType, sheetName: string, rowIndex?: number): boolean`
Registers an OID for a given entity type.
- **Parameters:**
  - `oid`: The proposed Object Identifier.
  - `type`: The `EntityType`.
  - `sheetName`: The name of the Excel sheet where the entity was found.
  - `rowIndex` (Optional): The row index of the entity definition.
- **Returns:** `true` if registration is successful (unique OID). `false` if a collision is detected.

#### `getCollisions(): OidCollision[]`
Retrieves all unique collisions encountered during the registry's lifecycle.
- **Returns:** An array of `OidCollision` objects detailing the conflicts.
