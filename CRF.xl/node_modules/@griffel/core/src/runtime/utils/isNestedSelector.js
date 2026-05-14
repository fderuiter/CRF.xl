const regex = /^(:|\[|>|&)/;
export function isNestedSelector(property) {
    return regex.test(property);
}
//# sourceMappingURL=isNestedSelector.js.map