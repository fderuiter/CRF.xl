export function generateCombinedQuery(currentMediaQuery, nestedMediaQuery) {
    if (currentMediaQuery.length === 0) {
        return nestedMediaQuery;
    }
    return `${currentMediaQuery} and ${nestedMediaQuery}`;
}
//# sourceMappingURL=generateCombinedMediaQuery.js.map