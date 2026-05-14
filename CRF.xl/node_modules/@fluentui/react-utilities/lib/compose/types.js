/**
 * This type should be used in place of `React.RefAttributes<T>` in all components that specify `ref` prop.
 *
 * If user is using React 18 types `>=18.2.61`, they will run into type issues of incompatible refs, using this type mitigates this issues across react type versions.
 *
 * @remarks
 *
 * React 18 types introduced Type Expansion Change to the `RefAttributes` interface as patch release.
 * These changes were released in `@types/react@18.2.61` (replacing ref with `LegacyRef`, which leaks `string` into the union type, causing breaking changes between v8/v9 libraries):
 *  - {@link https://github.com/DefinitelyTyped/DefinitelyTyped/pull/68720 | PR }
 *  - {@link https://app.unpkg.com/@types/react@18.2.61/files/index.d.ts | shipped definitions }
 *
 *
 * In React 19 types this was "reverted" back to the original `Ref<T>` type.
 * In order to maintain compatibility with React 17,18,19, we are forced to use our own version of `RefAttributes`.
 *
 */ export { };
