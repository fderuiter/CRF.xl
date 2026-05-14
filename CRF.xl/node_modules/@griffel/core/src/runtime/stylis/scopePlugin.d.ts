import type { Middleware } from 'stylis';
/**
 * Stylis middleware that canonicalizes `@scope` rules.
 *
 * 1. Inserts `(rootSelector)` into the `@scope` prelude — source emits @scope to (.b){…}` and we rewrite to
 *    `@scope (rootSelector) to (.b){…}`.
 * 2. Strips the `${rootSelector} ` prefix that stylis prepends to descendants of `@scope` via CSS Nesting
 *    (`.X :scope` → `:scope`).
 * 3. Hoists conditional at-rule children of `@scope` (`@media`, `@supports`, `@layer`, `@container`) so they wrap
 *    a clone of `@scope` instead of nesting inside. This keeps `@scope` innermost regardless of authoring order.
 */
export declare function scopePlugin(rootSelector: string): Middleware;
