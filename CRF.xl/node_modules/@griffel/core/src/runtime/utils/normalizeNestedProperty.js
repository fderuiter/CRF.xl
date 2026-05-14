export function normalizeNestedProperty(nestedProperty) {
    if (nestedProperty.charAt(0) === '&') {
        return nestedProperty.slice(1);
    }
    return nestedProperty;
}
//# sourceMappingURL=normalizeNestedProperty.js.map