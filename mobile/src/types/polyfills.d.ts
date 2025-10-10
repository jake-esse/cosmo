/**
 * Type declarations for polyfill-related modules
 *
 * These modules don't ship with TypeScript definitions,
 * so we declare them here to satisfy the type checker.
 */

/**
 * React Native's polyfill utility for adding global polyfills
 */
declare module 'react-native/Libraries/Utilities/PolyfillFunctions' {
  /**
   * Polyfills a global variable
   * @param name - The name of the global to polyfill
   * @param getValue - Function that returns the polyfill value
   */
  export function polyfillGlobal<T>(name: string, getValue: () => T): void;
}

/**
 * structuredClone polyfill for deep cloning objects
 */
declare module '@ungap/structured-clone' {
  /**
   * Deep clone an object using the structured clone algorithm
   * @param value - The value to clone
   * @param options - Optional transfer options
   */
  function structuredClone<T>(value: T, options?: { transfer?: any[] }): T;
  export default structuredClone;
}
