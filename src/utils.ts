/**
 * Like `keyof T` but it only includes `void` typed keys.
 *
 * @see `EventEmitter#emit`
 * @param T a type.
 */
export type VoidKeys<T> = {[K in keyof T]: void extends T[K] ? K : never}[keyof T];

/**
 * Like `keyof T` but it excludes `void` typed keys.
 *
 * @see `EventEmitter#emit`
 * @param T a type.
 */
export type NonVoidKeys<T> = {[K in keyof T]: void extends T[K] ? never : K}[keyof T];
