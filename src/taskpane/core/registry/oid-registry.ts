/**
 * @issue #337
 */
export type EntityType = "Form" | "Codelist" | "Item";

export interface OidCollision {
  oid: string;
  type: EntityType;
  existingType: EntityType;
  sheetName: string;
  rowIndex?: number;
}

export class GlobalOidRegistry {
  private registry = new Map<string, EntityType>();
  private reportedCollisions = new Set<string>();
  private collisions: OidCollision[] = [];

  public register(oid: string, type: EntityType, sheetName: string, rowIndex?: number): boolean {
    if (!oid) return false;
    const normalized = oid.trim().toLowerCase();
    
    if (this.registry.has(normalized)) {
      if (!this.reportedCollisions.has(normalized)) {
        this.collisions.push({
          oid: oid.trim(),
          type,
          existingType: this.registry.get(normalized)!,
          sheetName,
          rowIndex,
        });
        this.reportedCollisions.add(normalized);
      }
      return false; // Collision detected
    }
    
    this.registry.set(normalized, type);
    return true; // Successfully registered
  }

  public getCollisions(): OidCollision[] {
    return this.collisions;
  }
}
