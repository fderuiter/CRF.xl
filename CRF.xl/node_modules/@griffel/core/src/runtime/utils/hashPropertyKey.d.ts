import type { PropertyHash } from '../../types.js';
import type { AtRules } from './types.js';
export declare function atRulesToString(atRules: AtRules): string;
export declare function hashPropertyKey(selector: string, property: string, atRules: AtRules): PropertyHash;
