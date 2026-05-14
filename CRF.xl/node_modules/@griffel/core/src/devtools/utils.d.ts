import type { LookupItem } from '../types.js';
import type { DebugAtomicClassName, DebugSequence } from './types.js';
export declare function getDebugClassNames(lookupItem: LookupItem, parentLookupItem?: LookupItem, parentDebugClassNames?: DebugAtomicClassName[], overridingSiblings?: DebugSequence[]): DebugAtomicClassName[];
