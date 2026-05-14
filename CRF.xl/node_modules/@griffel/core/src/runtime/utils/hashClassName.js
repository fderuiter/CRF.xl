import hashString from '@emotion/hash';
import { HASH_PREFIX } from '../../constants.js';
import { atRulesToString } from './hashPropertyKey.js';
export function hashClassName({ property, selector, salt, value }, atRules) {
    return (HASH_PREFIX +
        hashString(salt +
            selector +
            atRulesToString(atRules) +
            property +
            // Trimming of value is required to generate consistent hashes
            value.trim()));
}
//# sourceMappingURL=hashClassName.js.map