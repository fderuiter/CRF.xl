"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "globalPlugin", {
    enumerable: true,
    get: function() {
        return globalPlugin;
    }
});
const _stylis = require("stylis");
const globalPlugin = (element)=>{
    switch(element.type){
        case _stylis.RULESET:
            if (typeof element.props === 'string') {
                if (process.env.NODE_ENV !== 'production') {
                    throw new Error(`"element.props" has type "string" (${JSON.stringify(element.props, null, 2)}), it's not expected. Please report a bug if it happens.`);
                }
                return;
            }
            element.props = element.props.map((value)=>{
                // Avoids calling tokenize() on every string
                if (value.indexOf(':global(') === -1) {
                    return value;
                }
                return (0, _stylis.tokenize)(value).reduce((acc, value, index, children)=>{
                    if (value === '') {
                        return acc;
                    }
                    if (value === ':' && children[index + 1] === 'global') {
                        const selector = // An inner part of ":global()"
                        children[index + 2].slice(1, -1) + // A separator between selectors i.e. "body .class"
                        ' ';
                        acc.unshift(selector);
                        children[index + 1] = '';
                        children[index + 2] = '';
                        return acc;
                    }
                    acc.push(value);
                    return acc;
                }, []).join('');
            });
    }
}; //# sourceMappingURL=globalPlugin.js.map
