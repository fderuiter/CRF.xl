'use client';
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "renderToStyleElements", {
    enumerable: true,
    get: function() {
        return renderToStyleElements;
    }
});
const _core = require("@griffel/core");
const _react = require("react");
function renderToStyleElements(renderer) {
    const stylesheets = Object.values(renderer.stylesheets)// first sort: bucket by order [data-priority]
    .sort((a, b)=>{
        return Number(a.elementAttributes['data-priority']) - Number(b.elementAttributes['data-priority']);
    })// second sort: bucket by bucket name
    .sort((a, b)=>{
        return _core.styleBucketOrdering.indexOf(a.bucketName) - _core.styleBucketOrdering.indexOf(b.bucketName);
    })// third sort: media queries
    .sort((a, b)=>{
        const mediaA = a.elementAttributes['media'];
        const mediaB = b.elementAttributes['media'];
        if (mediaA && mediaB) {
            return renderer.compareMediaQueries(mediaA, mediaB);
        }
        if (mediaA || mediaB) {
            return mediaA ? 1 : -1;
        }
        return 0;
    });
    return stylesheets.map((stylesheet)=>{
        const cssRules = stylesheet.cssRules();
        // don't want to create any empty style elements
        if (!cssRules.length) {
            return null;
        }
        return (0, _react.createElement)('style', {
            key: stylesheet.bucketName,
            // TODO: support "nonce"
            // ...renderer.styleNodeAttributes,
            ...stylesheet.elementAttributes,
            'data-make-styles-rehydration': 'true',
            dangerouslySetInnerHTML: {
                __html: cssRules.join('')
            }
        });
    }).filter(Boolean);
} //# sourceMappingURL=renderToStyleElements.js.map
