/**
 * @param target
 * @param initialLoadedProps
 * @issue #369
 * @returns
 */
export function createSafeMock<T extends object>(target: T, initialLoadedProps?: Set<string>): T {
  const loadedProps = initialLoadedProps || new Set<string>();

  const handler: ProxyHandler<any> = {
    get(obj, prop) {
      if (prop === "__isProxy") return true;

      if (prop === "load") {
        return (props: any) => {
          if (typeof props === "string") {
            props.split(",").forEach((p) => {
              const cleaned = p.trim().replace(/^items\//, "");
              loadedProps.add(cleaned);
            });
          } else if (Array.isArray(props)) {
            props.forEach((p) => {
              const cleaned = p.trim().replace(/^items\//, "");
              loadedProps.add(cleaned);
            });
          }
          if (typeof obj.load === "function") obj.load(props);
        };
      }

      const val = obj[prop];

      if (
        typeof prop === "string" &&
        typeof val !== "function" &&
        typeof val !== "object" &&
        prop !== "context" &&
        prop !== "id" &&
        prop !== "items" &&
        prop !== "length" &&
        prop !== "then" &&
        !prop.startsWith("_")
      ) {
        if (val !== undefined && !loadedProps.has(prop)) {
          const err = new Error(
            `The property '${prop}' is not available. Before reading the property's value, call the load method on the containing object and call "context.sync()" on the associated request context.`
          );
          err.name = "OfficeExtension.Error";
          (err as any).code = "PropertyNotLoaded";
          throw err;
        }
      }

      if (typeof val === "function") {
        return function (...args: any[]) {
          const result = val.apply(obj, args);
          if (result && typeof result === "object" && !result.__isProxy && !Array.isArray(result)) {
            // It's a method returning a navigation property (like getRange())
            return createSafeMock(result);
          }
          return result;
        };
      }

      if (val && typeof val === "object" && !val.__isProxy && !Array.isArray(val)) {
        // Compute subset of loadedProps for this child property
        const childProps = new Set<string>();
        if (typeof prop === "string") {
          const prefix = prop + "/";
          for (const p of loadedProps) {
            if (p.startsWith(prefix)) {
              childProps.add(p.slice(prefix.length));
            }
          }
        }
        return createSafeMock(val, childProps);
      }

      return val;
    },
  };

  return new Proxy(target, handler) as T;
}
