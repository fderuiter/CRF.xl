"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: Object.getOwnPropertyDescriptor(all, name).get
    });
}
_export(exports, {
    get compileAtomicCSSRule () {
        return compileAtomicCSSRule;
    },
    get normalizePseudoSelector () {
        return normalizePseudoSelector;
    }
});
const _compileCSSRules = require("./compileCSSRules.cjs");
const _hyphenateProperty = require("./utils/hyphenateProperty.cjs");
const _normalizeNestedProperty = require("./utils/normalizeNestedProperty.cjs");
const PSEUDO_SELECTOR_REGEX = /,( *[^ &])/g;
function normalizePseudoSelector(pseudoSelector) {
    return '&' + (0, _normalizeNestedProperty.normalizeNestedProperty)(// Regex there replaces a comma, spaces and an ampersand if it's present with comma and an ampersand.
    // This allows to normalize input, see examples in JSDoc.
    pseudoSelector.replace(PSEUDO_SELECTOR_REGEX, ',&$1'));
}
function createCSSDeclaration(cssDeclaration, pseudos) {
    return pseudos.reduceRight((acc, selector)=>`${normalizePseudoSelector(selector)} { ${acc} }`, cssDeclaration);
}
function compileAtomicCSSRule(options, atRules) {
    const { className, selectors, property, rtlClassName, rtlProperty, rtlValue, value } = options;
    const { container, layer, media, scope, supports } = atRules;
    const classNameSelector = `.${className}`;
    const cssDeclaration = Array.isArray(value) ? `${value.map((v)=>`${(0, _hyphenateProperty.hyphenateProperty)(property)}: ${v}`).join(';')};` : `${(0, _hyphenateProperty.hyphenateProperty)(property)}: ${value};`;
    // Under @scope, the rule body is anchored on :scope (the spec-defined
    // alias for the scope root set via the (.className) prelude). @scope
    // wraps innermost so outer at-rules (@media, @supports, etc.) compose
    // around it. Separate blocks for LTR and RTL because the prelude
    // references the direction-specific atomic class.
    const ltrBody = createCSSDeclaration(cssDeclaration, selectors);
    let cssRule = scope ? `@scope (${classNameSelector}) ${scope} { :scope{${ltrBody}} }` : `${classNameSelector}{${ltrBody}}`;
    if (rtlProperty && rtlClassName) {
        const rtlClassNameSelector = `.${rtlClassName}`;
        const rtlCSSDeclaration = Array.isArray(rtlValue) ? `${rtlValue.map((v)=>`${(0, _hyphenateProperty.hyphenateProperty)(rtlProperty)}: ${v}`).join(';')};` : `${(0, _hyphenateProperty.hyphenateProperty)(rtlProperty)}: ${rtlValue};`;
        const rtlBody = createCSSDeclaration(rtlCSSDeclaration, selectors);
        cssRule += scope ? `@scope (${rtlClassNameSelector}) ${scope} { :scope{${rtlBody}} }` : `${rtlClassNameSelector}{${rtlBody}}`;
    }
    if (media) {
        cssRule = `@media ${media} { ${cssRule} }`;
    }
    if (layer) {
        cssRule = `@layer ${layer} { ${cssRule} }`;
    }
    if (supports) {
        cssRule = `@supports ${supports} { ${cssRule} }`;
    }
    if (container) {
        cssRule = `@container ${container} { ${cssRule} }`;
    }
    return (0, _compileCSSRules.compileCSSRules)(cssRule, true);
} //# sourceMappingURL=compileAtomicCSSRule.js.map
