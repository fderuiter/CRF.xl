/**
 * @issue #28
 */

export interface SourceMetadata {
    sourceRowIndex: number;
    sheetName?: string;
}

class Registry {
    private map = new WeakMap<object, SourceMetadata>();

    register(item: any, metadata: SourceMetadata): void {
        if (item && typeof item === 'object') {
            this.map.set(item, metadata);
        }
    }

    getSource(item: any): SourceMetadata | undefined {
        if (item && typeof item === 'object') {
            return this.map.get(item);
        }
        return undefined;
    }
}

export const SourceRegistry = new Registry();
