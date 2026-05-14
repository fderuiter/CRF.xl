/**
 * A version of makeResetStyles() that accepts build output as an input and skips all runtime transforms & DOM insertion.
 *
 * @private
 */
export declare function __resetCSS(ltrClassName: string, rtlClassName: string | null): () => string;
