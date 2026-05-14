import hash from '@emotion/hash';
import { DEBUG_SEQUENCE_SEPARATOR, SEQUENCE_HASH_LENGTH, SEQUENCE_PREFIX } from '../../constants.js';
function padEndHash(value) {
    const hashLength = value.length;
    if (hashLength === SEQUENCE_HASH_LENGTH) {
        return value;
    }
    for (let i = hashLength; i < SEQUENCE_HASH_LENGTH; i++) {
        value += '0';
    }
    return value;
}
export function hashSequence(classes, dir, sequenceIds = []) {
    if (process.env.NODE_ENV === 'production') {
        return SEQUENCE_PREFIX + padEndHash(hash(classes + dir));
    }
    return (SEQUENCE_PREFIX +
        padEndHash(hash(classes + dir)) +
        DEBUG_SEQUENCE_SEPARATOR +
        padEndHash(hash(sequenceIds.join(''))));
}
//# sourceMappingURL=hashSequence.js.map