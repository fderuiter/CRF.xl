/* eslint-disable no-fallthrough */ "use strict";
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
    get prefix () {
        return prefix;
    },
    get prefixerPlugin () {
        return prefixerPlugin;
    }
});
const _stylis = require("stylis");
function prefix(value, length, children) {
    switch((0, _stylis.hash)(value, length)){
        // color-adjust
        case 5103:
            return _stylis.WEBKIT + 'print-' + value + value;
        // backface-visibility, column, box-decoration-break
        case 3191:
        case 6645:
        case 3005:
        // mask, mask-image, mask-(mode|clip|size), mask-(repeat|origin), mask-position, mask-composite
        case 6391:
        case 5879:
        case 5623:
        case 6135:
        case 4599:
        case 4855:
            return _stylis.WEBKIT + value + value;
        // backdrop-filter, background-clip: text
        case 4215:
            // Additional check on "backdrop-(f)ilter" to prevent conflict with "background-clip"
            // https://github.com/thysultan/stylis/issues/292
            if ((0, _stylis.charat)(value, 9) === 102) {
                return _stylis.WEBKIT + value + value;
            }
            // background-clip: text
            if ((0, _stylis.charat)(value, length + 1) === 116) {
                return _stylis.WEBKIT + value + value;
            }
            break;
        // tab-size
        case 4789:
            return _stylis.MOZ + value + value;
        // appearance, user-select, hyphens
        case 5349:
        case 4246:
        case 6968:
            return _stylis.WEBKIT + value + _stylis.MOZ + value + value;
        // cursor
        // @ts-expect-error fall through is intentional here
        case 6187:
            if (!(0, _stylis.match)(value, /grab/)) {
                return (0, _stylis.replace)((0, _stylis.replace)((0, _stylis.replace)(value, /(zoom-|grab)/, _stylis.WEBKIT + '$1'), /(image-set)/, _stylis.WEBKIT + '$1'), value, '') + value;
            }
        // background, background-image
        case 5495:
        case 3959:
            // eslint-disable-next-line no-useless-concat
            return (0, _stylis.replace)(value, /(image-set\([^]*)/, _stylis.WEBKIT + '$1' + '$`$1');
        // (margin|padding)-inline-(start|end)
        case 4095:
        case 3583:
        case 4068:
        case 2532:
            return (0, _stylis.replace)(value, /(.+)-inline(.+)/, _stylis.WEBKIT + '$1$2') + value;
        // (min|max)?(width|height|inline-size|block-size)
        case 8116:
        case 7059:
        case 5753:
        case 5535:
        case 5445:
        case 5701:
        case 4933:
        case 4677:
        case 5533:
        case 5789:
        case 5021:
        case 4765:
            // stretch fill-available
            if ((0, _stylis.strlen)(value) - 1 - length > 6) switch((0, _stylis.charat)(value, length + 1)){
                // (f)ill-available
                // @ts-expect-error fall through is intentional here
                case 102:
                    if ((0, _stylis.charat)(value, length + 3) === 108) {
                        return (0, _stylis.replace)(value, /(.+:)(.+)-([^]+)/, // eslint-disable-next-line no-useless-concat, eqeqeq
                        '$1' + _stylis.WEBKIT + '$2-$3' + '$1' + _stylis.MOZ + ((0, _stylis.charat)(value, length + 3) == 108 ? '$3' : '$2-$3')) + value;
                    }
                // (s)tretch
                case 115:
                    return ~(0, _stylis.indexof)(value, 'stretch') ? prefix((0, _stylis.replace)(value, 'stretch', 'fill-available'), length, children) + value : value;
            }
            break;
    }
    return value;
}
function prefixerPlugin(element, index, children, callback) {
    if (element.length > -1) {
        if (!element.return) switch(element.type){
            case _stylis.DECLARATION:
                element.return = prefix(element.value, element.length, children);
                return;
            case _stylis.RULESET:
                if (element.length) // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                return (0, _stylis.combine)(element.props, function(value) {
                    switch((0, _stylis.match)(value, /(::plac\w+|:read-\w+)/)){
                        // :read-(only|write)
                        case ':read-only':
                        case ':read-write':
                            return (0, _stylis.serialize)(// eslint-disable-next-line @typescript-eslint/ban-ts-comment
                            // @ts-ignore
                            [
                                (0, _stylis.copy)(element, {
                                    props: [
                                        (0, _stylis.replace)(value, /:(read-\w+)/, ':' + _stylis.MOZ + '$1')
                                    ]
                                })
                            ], callback);
                        // :placeholder
                        case '::placeholder':
                            return (0, _stylis.serialize)([
                                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                                // @ts-ignore
                                (0, _stylis.copy)(element, {
                                    props: [
                                        (0, _stylis.replace)(value, /:(plac\w+)/, ':' + _stylis.WEBKIT + 'input-$1')
                                    ]
                                }),
                                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                                // @ts-ignore
                                (0, _stylis.copy)(element, {
                                    props: [
                                        (0, _stylis.replace)(value, /:(plac\w+)/, ':' + _stylis.MOZ + '$1')
                                    ]
                                })
                            ], callback);
                    }
                    return '';
                });
        }
    }
    return undefined;
} //# sourceMappingURL=prefixerPlugin.js.map
