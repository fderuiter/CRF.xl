import { LAYER, MEDIA, SUPPORTS } from 'stylis';
export function isAtRuleElement(element) {
    switch (element.type) {
        case '@container':
        case MEDIA:
        case SUPPORTS:
        case LAYER:
            return true;
    }
    return false;
}
//# sourceMappingURL=isAtRuleElement.js.map