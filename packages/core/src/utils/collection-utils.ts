/**
 * @issue #76
 * Polyfill for Map.groupBy (ECMAScript 2024)
 * For environments where Map.groupBy is not yet available (e.g. Node 20 or older browsers).
 */

export function groupBy<T, K>(
  items: Iterable<T>,
  callbackfn: (item: T, index: number) => K
): Map<K, T[]> {
  const map = new Map<K, T[]>();
  let i = 0;
  for (const item of items) {
    const key = callbackfn(item, i++);
    const list = map.get(key);
    if (list) {
      list.push(item);
    } else {
      map.set(key, [item]);
    }
  }
  return map;
}
